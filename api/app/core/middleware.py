"""Middleware stack for CIPHER AI FastAPI backend.

Provides:
1. Request ID tracing and access logging (sanitization, X-Request-ID echo, query-free access logs)
2. Request body size limit enforcement at ASGI layer (Content-Length and streamed)
3. Security headers on all responses (nosniff, frame denial, HSTS in production, cache-control)
4. Strict CORS allowlisting
"""

import contextlib
import json
import logging
import time

from fastapi import FastAPI, Request, Response
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.middleware.cors import CORSMiddleware
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from app.core.config import Settings
from app.core.errors import InputTooLargeError, build_error_envelope
from app.core.logging import get_request_id, set_request_id
from app.core.metrics import metrics
from app.core.security import sanitize_request_id

logger = logging.getLogger("cipher.access")


class RequestIdAndLoggingMiddleware(BaseHTTPMiddleware):
    """Assigns/validates X-Request-ID, tracks duration, and emits query-free access logs."""

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        # Extract and sanitize incoming X-Request-ID
        incoming_id = request.headers.get("X-Request-ID")
        req_id = sanitize_request_id(incoming_id)

        # Store in request state and contextvar
        request.state.request_id = req_id
        set_request_id(req_id)

        start_time = time.perf_counter()
        try:
            response = await call_next(request)
        except Exception:
            # Re-raise so exception handlers format the envelope
            raise
        finally:
            duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
            status_code = getattr(response, "status_code", 500) if "response" in locals() else 500

            # Record in-memory metrics safely (no crash risk)
            with contextlib.suppress(Exception):
                metrics.record_http_request(
                    request.method, request.url.path, status_code, duration_ms
                )

            # Access log without query strings or user payloads
            logger.info(
                "Access log",
                extra={
                    "method": request.method,
                    "path": request.url.path,
                    "status_code": status_code,
                    "duration_ms": duration_ms,
                    "request_id": req_id,
                },
            )

        # Ensure X-Request-ID is present on every outgoing response
        response.headers["X-Request-ID"] = req_id
        return response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Applies defensive security headers to all responses."""

    def __init__(self, app: ASGIApp, app_env: str = "development") -> None:
        super().__init__(app)
        self.app_env = app_env

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        response = await call_next(request)

        # Standard defense-in-depth headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "no-referrer"
        response.headers["Permissions-Policy"] = (
            "camera=(), microphone=(), geolocation=(), payment=()"
        )

        # Disable client caching on API endpoints
        if request.url.path.startswith("/api/"):
            response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
            response.headers["Pragma"] = "no-cache"

        # Strict Transport Security in production only
        if self.app_env == "production":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

        return response


class RequestBodyLimitMiddleware:
    """Pure ASGI middleware enforcing maximum request body byte size.

    Inspects Content-Length upfront and tracks streaming chunks to prevent memory exhaustion.
    """

    def __init__(self, app: ASGIApp, max_bytes: int = 20000) -> None:
        self.app = app
        self.max_bytes = max_bytes

    async def _send_413_response(self, scope: Scope, send: Send, req_id: str) -> None:
        envelope = build_error_envelope(
            code="INPUT_TOO_LARGE",
            message="Payload exceeds maximum allowed size.",
            details=[],
            request_id=req_id,
        )
        body = json.dumps(envelope).encode("utf-8")
        headers = [
            (b"content-type", b"application/json"),
            (b"content-length", str(len(body)).encode("ascii")),
            (b"x-request-id", req_id.encode("ascii")),
            (b"x-content-type-options", b"nosniff"),
            (b"x-frame-options", b"DENY"),
            (b"referrer-policy", b"no-referrer"),
        ]
        await send({"type": "http.response.start", "status": 413, "headers": headers})
        await send({"type": "http.response.body", "body": body, "more_body": False})

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        # Resolve request ID for potential early 413 response
        raw_headers = dict(scope.get("headers", []))
        incoming_req_id = raw_headers.get(b"x-request-id", b"").decode("ascii", errors="ignore")
        req_id = sanitize_request_id(incoming_req_id) if incoming_req_id else get_request_id()

        # Check Content-Length header upfront if present
        raw_content_length = raw_headers.get(b"content-length")
        if raw_content_length:
            try:
                length = int(raw_content_length.decode("ascii"))
                if length > self.max_bytes:
                    await self._send_413_response(scope, send, req_id or sanitize_request_id(None))
                    return
            except ValueError:
                pass

        total_bytes = 0

        async def limited_receive() -> Message:
            nonlocal total_bytes
            message = await receive()
            if message.get("type") == "http.request":
                chunk = message.get("body", b"")
                total_bytes += len(chunk)
                if total_bytes > self.max_bytes:
                    raise InputTooLargeError("Payload exceeds maximum allowed size.")
            return message

        try:
            await self.app(scope, limited_receive, send)
        except InputTooLargeError:
            await self._send_413_response(scope, send, req_id or sanitize_request_id(None))


def setup_middleware(app: FastAPI, settings: Settings) -> None:
    """Register all middlewares in explicit, documented order.

    Execution order for incoming requests:
    1. CORS Middleware (evaluates Preflight / Origin)
    2. Security Headers Middleware (sets headers on response)
    3. RequestId and Logging Middleware (attaches trace ID, query-free access logs)
    4. RequestBodyLimitMiddleware (ASGI level: checks against MAX_REQUEST_BODY_BYTES)
    """
    # 4. Request Body Limit (innermost HTTP middleware)
    app.add_middleware(
        RequestBodyLimitMiddleware,
        max_bytes=settings.MAX_REQUEST_BODY_BYTES,
    )

    # 3. Request ID and Access Logging
    app.add_middleware(RequestIdAndLoggingMiddleware)

    # 2. Security Headers
    app.add_middleware(
        SecurityHeadersMiddleware,
        app_env=settings.APP_ENV,
    )

    # 1. CORS allowlisting (outermost)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ALLOWED_ORIGINS,
        allow_credentials=False,
        allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type", "Authorization", "X-Request-ID"],
        expose_headers=["X-Request-ID"],
        max_age=600,
    )
