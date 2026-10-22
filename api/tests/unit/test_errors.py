"""Unit and integration tests for error envelopes, status codes, and exception handlers."""

from fastapi.testclient import TestClient

from app.schemas.errors import ErrorEnvelope


def _assert_valid_envelope(data: dict) -> None:
    """Validate structure matches Pydantic ErrorEnvelope model."""
    envelope = ErrorEnvelope.model_validate(data)
    assert envelope.error.code is not None
    assert envelope.error.message is not None
    assert isinstance(envelope.error.details, list)
    assert envelope.error.request_id is not None


def test_404_not_found_envelope(client: TestClient) -> None:
    """Unknown path returns 404 NOT_FOUND error envelope with request ID."""
    response = client.get("/api/v1/non-existent-route-999")
    assert response.status_code == 404
    data = response.json()

    _assert_valid_envelope(data)
    assert data["error"]["code"] == "NOT_FOUND"
    assert "not found" in data["error"]["message"].lower()

    # X-Request-ID matches
    req_header = response.headers.get("X-Request-ID")
    assert req_header is not None
    assert data["error"]["request_id"] == req_header


def test_405_method_not_allowed_envelope(client: TestClient) -> None:
    """Invoking an unsupported method on a route returns 405 METHOD_NOT_ALLOWED envelope."""
    response = client.post("/api/v1/health")
    assert response.status_code == 405
    data = response.json()

    _assert_valid_envelope(data)
    assert data["error"]["code"] == "METHOD_NOT_ALLOWED"
    assert data["error"]["request_id"] == response.headers.get("X-Request-ID")


def test_500_internal_error_hides_traceback(client: TestClient) -> None:
    """Unhandled exceptions return 500 INTERNAL_ERROR with generic message and no stack trace."""
    response = client.get("/api/v1/test-error")
    assert response.status_code == 500
    data = response.json()

    _assert_valid_envelope(data)
    assert data["error"]["code"] == "INTERNAL_ERROR"
    # Never leak internal secret or stack trace
    assert "sensitive_trace_token_12345" not in response.text
    assert "RuntimeError" not in response.text
    assert "traceback" not in response.text.lower()
    assert data["error"]["message"] == "An internal server error occurred. Please try again later."
    assert data["error"]["request_id"] == response.headers.get("X-Request-ID")


def test_422_validation_error_envelope(client: TestClient) -> None:
    """Validation failure returns 422 VALIDATION_ERROR without echoing sensitive user input."""
    sensitive_input = "https://very-sensitive-unauthorized-url-payload.com/login"
    # url exceeds 50 chars in SampleBody
    response = client.post(
        "/api/v1/test-validate",
        json={"url": sensitive_input},
    )
    assert response.status_code == 422
    data = response.json()

    _assert_valid_envelope(data)
    assert data["error"]["code"] == "VALIDATION_ERROR"
    assert len(data["error"]["details"]) > 0

    # Ensure field path is present
    detail = data["error"]["details"][0]
    assert detail["field"] == "url"
    assert "characters" in detail["issue"]

    # Security check: sensitive input string must NOT be echoed in error envelope
    assert sensitive_input not in response.text


def test_app_error_subclasses_attributes() -> None:
    """Verify that all AppError subclasses construct correct codes and statuses."""
    from app.core.errors import (
        DependencyUnavailableError,
        ForbiddenError,
        InputTooLargeError,
        InternalError,
        InvalidUrlError,
        MethodNotAllowedError,
        NotFoundError,
        RateLimitedError,
        UnauthenticatedError,
        ValidationError,
    )

    errors = [
        (ValidationError(), "VALIDATION_ERROR", 422),
        (InvalidUrlError(), "INVALID_URL", 422),
        (InputTooLargeError(), "INPUT_TOO_LARGE", 413),
        (UnauthenticatedError(), "UNAUTHENTICATED", 401),
        (ForbiddenError(), "FORBIDDEN", 403),
        (NotFoundError(), "NOT_FOUND", 404),
        (MethodNotAllowedError(), "METHOD_NOT_ALLOWED", 405),
        (RateLimitedError(), "RATE_LIMITED", 429),
        (DependencyUnavailableError(), "DEPENDENCY_UNAVAILABLE", 503),
        (InternalError(), "INTERNAL_ERROR", 500),
    ]

    for err, expected_code, expected_status in errors:
        assert err.code == expected_code
        assert err.http_status == expected_status
        assert err.message != ""
        assert isinstance(err.details, list)
