"""Unit and middleware tests for request ID handling and sanitization."""

import uuid

from fastapi.testclient import TestClient

from app.core.security import sanitize_request_id


def test_sanitize_valid_request_ids() -> None:
    """Safe alphanumeric, hyphen, and underscore IDs between 8 and 64 chars are preserved."""
    valid_ids = [
        "abcd-1234-efgh-5678",
        "req_9876543210_valid",
        "0123456789abcdef",
        "A" * 64,
    ]
    for valid_id in valid_ids:
        assert sanitize_request_id(valid_id) == valid_id


def test_sanitize_invalid_and_injection_request_ids() -> None:
    """Null, short, overlong, or newline-containing IDs are replaced with valid UUID4."""
    invalid_ids = [
        None,
        "",
        "short",  # < 8 chars
        "A" * 65,  # > 64 chars
        "req-id-with\nnewline",
        "req id with spaces",
        "req<script>alert(1)</script>",
        "semi;colon$injection",
    ]
    for invalid_id in invalid_ids:
        cleaned = sanitize_request_id(invalid_id)
        assert cleaned != invalid_id
        # Must be valid UUID4
        uuid_obj = uuid.UUID(cleaned, version=4)
        assert str(uuid_obj) == cleaned


def test_request_id_header_in_success_response(client: TestClient) -> None:
    """Valid client-supplied X-Request-ID is preserved and echoed on 200 OK."""
    client_id = "test-client-trace-12345"
    response = client.get("/api/v1/health", headers={"X-Request-ID": client_id})
    assert response.status_code == 200
    assert response.headers.get("X-Request-ID") == client_id


def test_request_id_generated_when_missing(client: TestClient) -> None:
    """When no X-Request-ID is sent, server generates a valid UUID4 and echoes it."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    req_id = response.headers.get("X-Request-ID")
    assert req_id is not None
    # Must be valid UUID
    uuid.UUID(req_id, version=4)


def test_request_id_replaced_when_malicious_in_request(client: TestClient) -> None:
    """Malicious incoming X-Request-ID is replaced with clean UUID4 on response."""
    response = client.get(
        "/api/v1/health",
        headers={"X-Request-ID": "bad\r\ninjection\nheader"},
    )
    assert response.status_code == 200
    req_id = response.headers.get("X-Request-ID")
    assert req_id is not None
    assert "bad" not in req_id
    assert "\n" not in req_id
    uuid.UUID(req_id, version=4)


def test_request_id_present_on_error_response(client: TestClient) -> None:
    """X-Request-ID is present and matches the envelope on 404, 405, and 500 errors."""
    for path, method in [
        ("/api/v1/unknown-path-404", "GET"),
        ("/api/v1/health", "POST"),
        ("/api/v1/test-error", "GET"),
    ]:
        client_id = f"custom-trace-{uuid.uuid4().hex[:12]}"
        response = client.request(method, path, headers={"X-Request-ID": client_id})
        assert response.headers.get("X-Request-ID") == client_id
        data = response.json()
        assert data["error"]["request_id"] == client_id
