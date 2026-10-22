"""Structured JSON logging and secret redaction for CIPHER AI.

Outputs single-line JSON logs with UTC timestamps, request context, and
automatic redaction of sensitive credentials and tokens.
"""

import json
import logging
import re
import sys
from contextvars import ContextVar
from datetime import UTC, datetime
from typing import Any

# ContextVar for tracing request IDs across async boundaries
request_id_ctx: ContextVar[str] = ContextVar("request_id", default="")


def get_request_id() -> str:
    """Retrieve current request ID from context or return empty string."""
    return request_id_ctx.get()


def set_request_id(req_id: str) -> None:
    """Set current request ID in context."""
    request_id_ctx.set(req_id)


# Keys whose values must always be redacted in structured log fields and headers
REDACTED_KEYS = {
    "authorization",
    "api_key",
    "apikey",
    "token",
    "secret",
    "password",
    "service_role",
    "supabase_service_role_key",
    "supabase_jwt_secret",
    "llm_api_key",
    "cookie",
    "set-cookie",
}

# Regex to detect and mask Bearer / API keys within strings if accidentally logged
SECRET_INLINE_PATTERNS = [
    re.compile(r"(bearer\s+)([A-Za-z0-9\-_\.]+)", re.IGNORECASE),
    re.compile(r"(apikey\s*[:=]\s*)([A-Za-z0-9\-_\.]+)", re.IGNORECASE),
]


def redact_sensitive_value(key: str, value: Any) -> Any:
    """Recursively redact sensitive keys and pattern matches in structured data."""
    if key.lower() in REDACTED_KEYS:
        return "[REDACTED]"

    if isinstance(value, dict):
        return {k: redact_sensitive_value(k, v) for k, v in value.items()}

    if isinstance(value, list | tuple):
        return [redact_sensitive_value(key, item) for item in value]

    if isinstance(value, str):
        cleaned = value
        for pattern in SECRET_INLINE_PATTERNS:
            cleaned = pattern.sub(r"\1[REDACTED]", cleaned)
        return cleaned

    return value


class JsonFormatter(logging.Formatter):
    """Custom formatter producing structured single-line JSON log events."""

    def format(self, record: logging.LogRecord) -> str:
        # Base log object
        log_obj: dict[str, Any] = {
            "timestamp": datetime.now(UTC).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "request_id": get_request_id() or getattr(record, "request_id", None) or None,
        }

        # Include structured extra fields if present
        for key, val in record.__dict__.items():
            if key not in {
                "name",
                "msg",
                "args",
                "levelname",
                "levelno",
                "pathname",
                "filename",
                "module",
                "exc_info",
                "exc_text",
                "stack_info",
                "lineno",
                "funcName",
                "created",
                "msecs",
                "relativeCreated",
                "thread",
                "threadName",
                "processName",
                "process",
                "request_id",
            }:
                log_obj[key] = redact_sensitive_value(key, val)

        # Include exception info safely without user input
        if record.exc_info:
            log_obj["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_obj, ensure_ascii=False)


class SecretRedactionFilter(logging.Filter):
    """Logging filter ensuring messages and arguments have sensitive values redacted."""

    def filter(self, record: logging.LogRecord) -> bool:
        if isinstance(record.msg, str):
            for pattern in SECRET_INLINE_PATTERNS:
                record.msg = pattern.sub(r"\1[REDACTED]", record.msg)
        return True


def setup_logging(log_level: str = "INFO") -> None:
    """Configure root logger and formatters."""
    root_logger = logging.getLogger()
    numeric_level = getattr(logging, log_level.upper(), logging.INFO)
    root_logger.setLevel(numeric_level)

    # Remove existing stream handlers to prevent duplicates
    for handler in list(root_logger.handlers):
        root_logger.removeHandler(handler)

    stream_handler = logging.StreamHandler(sys.stdout)
    stream_handler.setFormatter(JsonFormatter())
    stream_handler.addFilter(SecretRedactionFilter())
    root_logger.addHandler(stream_handler)

    # Adjust third-party noisy loggers
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.error").setLevel(numeric_level)
