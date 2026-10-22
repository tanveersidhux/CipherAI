"""Pydantic schemas for the standardized API error envelope.

Conforms field-for-field to docs/api/schemas/error-envelope.schema.json.
"""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

ErrorCode = Literal[
    "VALIDATION_ERROR",
    "INVALID_URL",
    "INPUT_TOO_LARGE",
    "UNAUTHENTICATED",
    "FORBIDDEN",
    "NOT_FOUND",
    "METHOD_NOT_ALLOWED",
    "RATE_LIMITED",
    "DEPENDENCY_UNAVAILABLE",
    "INTERNAL_ERROR",
]


class ErrorDetailItem(BaseModel):
    """Specific field-level or parameter-level error issue."""

    model_config = ConfigDict(extra="forbid")

    field: str | None = Field(
        default=None,
        description="Path to field or parameter that caused the issue, or null for general issues.",
    )
    issue: str = Field(
        ...,
        description="Human-readable description of the constraint violation or error.",
    )


class ErrorPayload(BaseModel):
    """Inner error payload of the envelope."""

    model_config = ConfigDict(extra="forbid")

    code: ErrorCode = Field(..., description="Stable SCREAMING_SNAKE_CASE error code.")
    message: str = Field(..., description="User-safe error explanation.")
    details: list[ErrorDetailItem] = Field(
        default_factory=list,
        description="Optional list of granular field or validation issues.",
    )
    request_id: str = Field(
        ...,
        description="Unique request trace ID matching X-Request-ID response header.",
    )


class ErrorEnvelope(BaseModel):
    """Standardized top-level error response envelope."""

    model_config = ConfigDict(extra="forbid")

    error: ErrorPayload
