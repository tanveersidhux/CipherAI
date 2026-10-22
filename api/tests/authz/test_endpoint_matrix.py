"""Authorization matrix verification test suite.

Asserts that all endpoints in the application inventory strictly enforce their
declared access control contracts (public vs authenticated).
"""

from datetime import UTC, datetime, timedelta

import jwt
import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app

JWT_SECRET = "matrix-secret-jwt-test-key-32chars"


def make_auth_token(sub: str = "matrix-user-uuid", email: str = "user@test.org") -> str:
    now = datetime.now(UTC)
    payload = {
        "sub": sub,
        "email": email,
        "aud": "authenticated",
        "exp": int((now + timedelta(hours=2)).timestamp()),
        "iat": int(now.timestamp()),
    }
    return jwt.encode(payload, key=JWT_SECRET, algorithm="HS256")


@pytest.fixture
def auth_client() -> TestClient:
    settings = Settings(
        APP_ENV="development",
        APP_VERSION="1.0.0",
        SUPABASE_JWT_SECRET=JWT_SECRET,
        FEATURE_REPUTATION=True,
        FEATURE_EMAIL_ANALYSIS=True,
        FEATURE_BATCH=True,
        FEATURE_EXPORT=True,
    )
    app = create_app(settings=settings)
    return TestClient(app, raise_server_exceptions=False)


# --- 1. PUBLIC ENDPOINTS (Must allow unauthenticated access without 401) ---


@pytest.mark.parametrize(
    "method, path, payload",
    [
        ("GET", "/api/v1/health", None),
        ("GET", "/api/v1/config/features", None),
        ("POST", "/api/v1/scans/url", {"url": "https://example.com"}),
        ("POST", "/api/v1/scans/message", {"message": "Hello this is a test message"}),
        ("POST", "/api/v1/scans/email", {"raw_email": "Subject: Test\nFrom: a@b.com\n\nHello"}),
    ],
)
def test_public_endpoints_allow_unauthenticated(
    auth_client: TestClient, method: str, path: str, payload: dict | None
):
    resp = auth_client.get(path) if method == "GET" else auth_client.post(path, json=payload)

    assert resp.status_code != 401, f"Public endpoint {method} {path} returned 401 Unauthorized."
    assert resp.status_code in (200, 201, 202)


# --- 2. PROTECTED ENDPOINTS (Must return 401 when unauthenticated) ---


@pytest.mark.parametrize(
    "method, path, payload",
    [
        ("DELETE", "/api/v1/me/data", {"confirm": "DELETE"}),
        ("GET", "/api/v1/dashboard/summary", None),
        ("GET", "/api/v1/scans", None),
        ("POST", "/api/v1/cases", {"title": "Test Case", "description": "Desc"}),
        ("GET", "/api/v1/cases", None),
        ("GET", "/api/v1/cases/00000000-0000-0000-0000-000000000001", None),
        ("PATCH", "/api/v1/cases/00000000-0000-0000-0000-000000000001", {"title": "New"}),
        ("DELETE", "/api/v1/cases/00000000-0000-0000-0000-000000000001", None),
        ("POST", "/api/v1/cases/00000000-0000-0000-0000-000000000001/notes", {"body": "Note"}),
        (
            "POST",
            "/api/v1/cases/00000000-0000-0000-0000-000000000001/scans",
            {"scan_id": "00000000-0000-0000-0000-000000000001"},
        ),
        (
            "DELETE",
            "/api/v1/cases/00000000-0000-0000-0000-000000000001/scans/00000000-0000-0000-0000-000000000001",
            None,
        ),
        ("GET", "/api/v1/cases/00000000-0000-0000-0000-000000000001/export?format=json", None),
        ("POST", "/api/v1/batches", {"urls": ["https://example.com"]}),
        ("GET", "/api/v1/batches/00000000-0000-0000-0000-000000000001", None),
        ("GET", "/api/v1/batches/00000000-0000-0000-0000-000000000001/items", None),
        ("POST", "/api/v1/batches/00000000-0000-0000-0000-000000000001/cancel", None),
    ],
)
def test_protected_endpoints_reject_unauthenticated(
    auth_client: TestClient, method: str, path: str, payload: dict | None
):
    if method == "GET":
        resp = auth_client.get(path)
    elif method == "POST":
        resp = auth_client.post(path, json=payload)
    elif method == "PATCH":
        resp = auth_client.patch(path, json=payload)
    elif method == "DELETE":
        resp = auth_client.request("DELETE", path, json=payload)
    else:
        raise ValueError(f"Unknown method {method}")

    assert resp.status_code == 401, (
        f"Protected endpoint {method} {path} did not reject with 401. Got {resp.status_code}"
    )
    error_body = resp.json()
    assert "error" in error_body


@pytest.mark.parametrize(
    "method, path, payload",
    [
        ("GET", "/api/v1/dashboard/summary", None),
        ("GET", "/api/v1/cases", None),
        ("POST", "/api/v1/cases", {"title": "Test Case", "description": "Desc"}),
        ("POST", "/api/v1/batches", {"urls": ["https://example.com"]}),
    ],
)
def test_protected_endpoints_accept_valid_token(
    auth_client: TestClient, method: str, path: str, payload: dict | None
):
    valid_token = make_auth_token()
    headers = {"Authorization": f"Bearer {valid_token}"}

    if method == "GET":
        resp = auth_client.get(path, headers=headers)
    elif method == "POST":
        resp = auth_client.post(path, json=payload, headers=headers)
    else:
        raise ValueError(f"Unknown method {method}")

    assert resp.status_code in (200, 201, 202), (
        f"Endpoint {method} {path} failed with {resp.status_code}: {resp.text}"
    )
