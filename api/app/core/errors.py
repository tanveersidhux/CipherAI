"""Application exceptions, standard error envelope builder, and exception handlers.

Ensures every error response strictly conforms to the canonical ErrorEnvelope
schema { error: { code, message, details, request_id } } with X-Request-ID header.
"""

import logging
import uuid
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.logging import get_request_id
from app.schemas.errors import ErrorCode

logger = logging.getLogger("cipher.errors")


class AppError(Exception):
    """Base application exception for CIPHER AI errors."""

    def __init__(
        self,
        code: ErrorCode,
        message: str,
        http_status: int = 500,
        details: list[dict[str, Any]] | None = None,
        headers: dict[str, str] | None = None,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.http_status = http_status
        self.details = details or []
        self.headers = headers or {}


class ValidationError(AppError):
    """Validation failure on user-submitted parameters or request body."""

    def __init__(
        self,
        message: str = "Input validation failed.",
        details: list[dict[str, Any]] | None = None,
    ) -> None:
        super().__init__(
            code="VALIDATION_ERROR",
            message=message,
            http_status=422,
            details=details,
        )


class InvalidUrlError(AppError):
    """Target string does not conform to safe, valid URL syntax."""

    def __init__(
        self,
        message: str = "Submitted URL is malformed or invalid.",
        details: list[dict[str, Any]] | None = None,
        issue: str | None = None,
        field: str | None = "url",
    ) -> None:
        if details is None:
            details = [{"field": field, "issue": issue or "invalid_url"}]
        super().__init__(
            code="INVALID_URL",
            message=message,
            http_status=422,
            details=details,
        )


class InputTooLargeError(AppError):
    """Submitted payload or content exceeds maximum allowable character or byte limits."""

    def __init__(
        self,
        message: str = "Payload exceeds maximum allowed size.",
        details: list[dict[str, Any]] | None = None,
        field: str | None = None,
        max_allowed: int | None = None,
    ) -> None:
        if details is None:
            issue = f"exceeds_max_{max_allowed}" if max_allowed else "input_too_large"
            details = [{"field": field, "issue": issue}]
        super().__init__(
            code="INPUT_TOO_LARGE",
            message=message,
            http_status=413,
            details=details,
        )


PayloadTooLargeError = InputTooLargeError


class UnauthenticatedError(AppError):
    """Missing or invalid session or authentication credentials."""

    def __init__(
        self,
        message: str = "Authentication required.",
        details: list[dict[str, Any]] | None = None,
    ) -> None:
        super().__init__(
            code="UNAUTHENTICATED",
            message=message,
            http_status=401,
            details=details,
        )


class ForbiddenError(AppError):
    """Caller lacks authorization to access or mutate the requested resource."""

    def __init__(
        self,
        message: str = "Access forbidden.",
        details: list[dict[str, Any]] | None = None,
    ) -> None:
        super().__init__(
            code="FORBIDDEN",
            message=message,
            http_status=403,
            details=details,
        )


class NotFoundError(AppError):
    """Target resource, endpoint, or artifact was not found."""

    def __init__(
        self,
        message: str = "The requested resource was not found.",
        details: list[dict[str, Any]] | None = None,
    ) -> None:
        super().__init__(
            code="NOT_FOUND",
            message=message,
            http_status=404,
            details=details,
        )


class ConflictError(AppError):
    """Target resource state conflict (e.g. duplicate item)."""

    def __init__(
        self,
        message: str = "The request conflicts with existing state.",
        details: list[dict[str, Any]] | None = None,
    ) -> None:
        super().__init__(
            code="CONFLICT",
            message=message,
            http_status=409,
            details=details,
        )


class MethodNotAllowedError(AppError):
    """HTTP method is not supported for the requested route."""

    def __init__(
        self,
        message: str = "Method not allowed for requested route.",
        details: list[dict[str, Any]] | None = None,
    ) -> None:
        super().__init__(
            code="METHOD_NOT_ALLOWED",
            message=message,
            http_status=405,
            details=details,
        )


class RateLimitedError(AppError):
    """Client has exceeded the scan rate limit."""

    def __init__(
        self,
        message: str = "Rate limit exceeded. Please wait before submitting another scan.",
        details: list[dict[str, Any]] | None = None,
        retry_after: int = 60,
    ) -> None:
        if details is None:
            details = [{"field": None, "issue": f"retry_after_{retry_after}s"}]
        super().__init__(
            code="RATE_LIMITED",
            message=message,
            http_status=429,
            details=details,
            headers={"Retry-After": str(retry_after)},
        )
        self.retry_after = retry_after


class DependencyUnavailableError(AppError):
    """External dependency (e.g. database, upstream provider) is unavailable."""

    def __init__(
        self,
        message: str = "A required service dependency is currently unavailable.",
        details: list[dict[str, Any]] | None = None,
    ) -> None:
        super().__init__(
            code="DEPENDENCY_UNAVAILABLE",
            message=message,
            http_status=503,
            details=details,
        )


class InternalError(AppError):
    """Unexpected internal server error."""

    def __init__(
        self,
        message: str = "An internal server error occurred. Please try again later.",
        details: list[dict[str, Any]] | None = None,
    ) -> None:
        super().__init__(
            code="INTERNAL_ERROR",
            message=message,
            http_status=500,
            details=details,
        )


def build_error_envelope(
    code: str,
    message: str,
    details: list[dict[str, Any]] | None,
    request_id: str,
) -> dict[str, Any]:
    """Single-source builder for standard error envelope response structure."""
    try:
        from app.core.metrics import metrics

        metrics.record_error(code)
    except Exception:
        pass

    return {
        "error": {
            "code": code,
            "message": message,
            "details": details or [],
            "request_id": request_id,
        }
    }


def _resolve_request_id(request: Request) -> str:
    """Safely extract request ID from request state, context, or fallback to UUID4."""
    if hasattr(request, "state") and getattr(request.state, "request_id", None):
        return str(request.state.request_id)
    ctx_id = get_request_id()
    if ctx_id:
        return ctx_id
    return str(uuid.uuid4())


def _get_app_env(request: Request) -> str:
    """Safely extract app_env from application settings."""
    try:
        return getattr(request.app.state.settings, "APP_ENV", "development")
    except Exception:
        return "development"


def build_error_response(
    status_code: int,
    envelope: dict[str, Any],
    req_id: str,
    app_env: str = "development",
    custom_headers: dict[str, str] | None = None,
) -> JSONResponse:
    """Construct JSONResponse with standard error envelope and security headers."""
    headers: dict[str, str] = {
        "X-Request-ID": req_id,
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "Referrer-Policy": "no-referrer",
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "Pragma": "no-cache",
        "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
    }
    if app_env == "production":
        headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    if custom_headers:
        headers.update(custom_headers)

    return JSONResponse(
        status_code=status_code,
        content=envelope,
        headers=headers,
    )


async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    """Handle AppError domain exceptions."""
    req_id = _resolve_request_id(request)
    envelope = build_error_envelope(
        code=exc.code,
        message=exc.message,
        details=exc.details,
        request_id=req_id,
    )
    return build_error_response(
        status_code=exc.http_status,
        envelope=envelope,
        req_id=req_id,
        app_env=_get_app_env(request),
        custom_headers=exc.headers,
    )


async def validation_error_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """Handle Pydantic / FastAPI request validation errors."""
    req_id = _resolve_request_id(request)
    details: list[dict[str, Any]] = []

    for err in exc.errors():
        # Build dot-separated field path, omitting 'body' prefix for clarity
        loc_parts = [str(part) for part in err.get("loc", []) if part != "body"]
        field_path = ".".join(loc_parts) if loc_parts else None
        issue_msg = err.get("msg", "Validation error")

        # Crucial security rule: NEVER echo user input values into details
        details.append(
            {
                "field": field_path,
                "issue": issue_msg,
            }
        )

    envelope = build_error_envelope(
        code="VALIDATION_ERROR",
        message="Request payload or parameters failed validation.",
        details=details,
        request_id=req_id,
    )
    return build_error_response(
        status_code=422,
        envelope=envelope,
        req_id=req_id,
        app_env=_get_app_env(request),
    )


async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    """Handle HTTP exceptions like 404 Not Found and 405 Method Not Allowed."""
    req_id = _resolve_request_id(request)

    if exc.status_code == 404:
        code: ErrorCode = "NOT_FOUND"
        message = "The requested resource was not found."
    elif exc.status_code == 405:
        code = "METHOD_NOT_ALLOWED"
        message = "Method not allowed for requested route."
    elif exc.status_code == 413:
        code = "INPUT_TOO_LARGE"
        message = str(exc.detail) if exc.detail else "Payload exceeds maximum allowed size."
    else:
        code = "INTERNAL_ERROR"
        message = str(exc.detail) if exc.detail else "An unexpected error occurred."

    envelope = build_error_envelope(
        code=code,
        message=message,
        details=[],
        request_id=req_id,
    )
    return build_error_response(
        status_code=exc.status_code,
        envelope=envelope,
        req_id=req_id,
        app_env=_get_app_env(request),
    )


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Catch-all handler for unhandled exceptions (logs stack trace safely, returns generic 500)."""
    req_id = _resolve_request_id(request)

    # Log full traceback server-side only with the request ID, never return to client
    logger.exception(
        "Unhandled server exception occurred: %s", str(exc), extra={"request_id": req_id}
    )

    envelope = build_error_envelope(
        code="INTERNAL_ERROR",
        message="An internal server error occurred. Please try again later.",
        details=[],
        request_id=req_id,
    )
    return build_error_response(
        status_code=500,
        envelope=envelope,
        req_id=req_id,
        app_env=_get_app_env(request),
    )


def register_exception_handlers(app: FastAPI) -> None:
    """Register all standardized exception handlers on the FastAPI application."""
    app.add_exception_handler(AppError, app_error_handler)  # type: ignore[arg-type]
    app.add_exception_handler(RequestValidationError, validation_error_handler)  # type: ignore[arg-type]
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)  # type: ignore[arg-type]
    app.add_exception_handler(Exception, unhandled_exception_handler)
