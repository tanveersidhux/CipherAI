"""Integration tests for FastAPI scan endpoints and error envelopes."""

import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.core.rate_limit import rate_limiter
from app.main import create_app


@pytest.fixture
def client():
    # Use higher rate limit in general tests
    test_settings = Settings(RATE_LIMIT_SCANS_PER_MINUTE=100)
    app = create_app(test_settings)
    rate_limiter.reset()
    return TestClient(app)


def test_health_endpoint(client):
    res = client.get("/api/v1/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


def test_scan_url_success(client):
    payload = {"url": "https://example.com/login"}
    res = client.post("/api/v1/scans/url", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["schema_version"] == "1.0"
    assert data["scan_type"] == "url"
    assert "report_id" in data
    assert "X-Request-ID" in res.headers
    assert "X-RateLimit-Limit" in res.headers
    assert "X-RateLimit-Remaining" in res.headers


def test_scan_message_success(client):
    payload = {"message": "Wells Fargo Alert: Please verify your account at http://bit.ly/update"}
    res = client.post("/api/v1/scans/message", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["scan_type"] == "message"
    assert data["assessment"]["risk_score"] > 0


def test_scan_url_invalid_scheme_returns_422_invalid_url(client):
    payload = {"url": "javascript:alert(1)"}
    res = client.post("/api/v1/scans/url", json=payload)
    assert res.status_code == 422
    data = res.json()
    assert data["error"]["code"] == "INVALID_URL"
    assert "request_id" in data["error"]


def test_scan_url_too_large_returns_413(client):
    payload = {"url": "https://example.com/" + "a" * 2050}
    res = client.post("/api/v1/scans/url", json=payload)
    assert res.status_code == 413
    data = res.json()
    assert data["error"]["code"] == "INPUT_TOO_LARGE"


def test_scan_message_empty_returns_422_validation_error(client):
    payload = {"message": "   "}
    res = client.post("/api/v1/scans/message", json=payload)
    assert res.status_code == 422
    data = res.json()
    assert data["error"]["code"] == "VALIDATION_ERROR"


def test_scan_unknown_fields_rejected(client):
    payload = {"url": "https://example.com", "unknown_field": "bad"}
    res = client.post("/api/v1/scans/url", json=payload)
    assert res.status_code == 422
    data = res.json()
    assert data["error"]["code"] == "VALIDATION_ERROR"


def test_rate_limiting_triggers_429():
    strict_settings = Settings(RATE_LIMIT_SCANS_PER_MINUTE=2)
    app = create_app(strict_settings)
    rate_limiter.reset()
    c = TestClient(app)

    # 1st and 2nd should pass
    r1 = c.post("/api/v1/scans/url", json={"url": "https://example.com/1"})
    assert r1.status_code == 200
    r2 = c.post("/api/v1/scans/url", json={"url": "https://example.com/2"})
    assert r2.status_code == 200

    # 3rd must trigger 429
    r3 = c.post("/api/v1/scans/url", json={"url": "https://example.com/3"})
    assert r3.status_code == 429
    assert r3.headers.get("Retry-After") is not None
    err = r3.json()
    assert err["error"]["code"] == "RATE_LIMITED"
