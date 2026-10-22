"""Integration API tests for POST /api/v1/explanations and GET /api/v1/ai/status."""

import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app
from tests.ai.fakes import make_test_report


@pytest.fixture
def client() -> TestClient:
    settings = Settings(
        APP_ENV="test",
        AI_ENABLED=False,  # Use deterministic fallback in standard tests
        LLM_ENABLED=False,
        RATE_LIMIT_SCANS_PER_MINUTE=60,
    )
    app = create_app(settings=settings)
    return TestClient(app)


def test_get_ai_status_endpoint(client: TestClient):
    resp = client.get("/api/v1/ai/status")
    assert resp.status_code == 200
    data = resp.json()
    assert "ai_enabled" in data
    assert "provider_configured" in data
    assert "model" in data
    # Ensure no secret keys appear
    assert "api_key" not in data
    assert "secret" not in data


def test_post_explanations_returns_200_with_fallback(client: TestClient):
    report = make_test_report()
    payload = {
        "report": report.model_dump(),
        "audience_level": "simple",
    }

    resp = client.post("/api/v1/explanations", json=payload)
    assert resp.status_code == 200
    data = resp.json()

    assert "explanation" in data
    assert "meta" in data
    assert data["meta"]["explanation_source"] == "deterministic_fallback"
    assert data["meta"]["fallback_reason"] == "AI_DISABLED"
    assert "summary" in data["explanation"]
    assert "risk_statement" in data["explanation"]
    assert len(data["explanation"]["recommended_actions"]) > 0


def test_post_explanations_rejects_missing_required_fields(client: TestClient):
    resp = client.post("/api/v1/explanations", json={"audience_level": "simple"})
    assert resp.status_code == 422
    err_body = resp.json()
    assert "error" in err_body
    assert err_body["error"]["code"] == "VALIDATION_ERROR"


def test_post_explanations_rejects_malformed_report(client: TestClient):
    payload = {
        "report": {"invalid_key": 123},
        "audience_level": "simple",
    }
    resp = client.post("/api/v1/explanations", json=payload)
    assert resp.status_code == 422
    err_body = resp.json()
    assert err_body["error"]["code"] == "VALIDATION_ERROR"


def test_post_explanations_rejects_oversized_payload():
    # Configure tiny MAX_REQUEST_BODY_BYTES to trigger 413
    tiny_settings = Settings(
        APP_ENV="test",
        MAX_REQUEST_BODY_BYTES=1024,
    )
    tiny_app = create_app(settings=tiny_settings)
    tiny_client = TestClient(tiny_app)

    report = make_test_report(display_value="hxxp://example.com/" + "a" * 1500)
    payload = {
        "report": report.model_dump(),
    }
    resp = tiny_client.post("/api/v1/explanations", json=payload)
    assert resp.status_code == 413
    assert resp.json()["error"]["code"] == "INPUT_TOO_LARGE"


def test_post_explanations_rate_limiting():
    from app.core.rate_limit import rate_limiter

    rate_limiter.reset()
    # Configure 2 requests per minute limit
    rate_settings = Settings(
        APP_ENV="test",
        RATE_LIMIT_SCANS_PER_MINUTE=2,
    )
    rate_app = create_app(settings=rate_settings)
    rate_client = TestClient(rate_app)

    report = make_test_report()
    payload = {"report": report.model_dump()}

    r1 = rate_client.post("/api/v1/explanations", json=payload)
    assert r1.status_code == 200

    r2 = rate_client.post("/api/v1/explanations", json=payload)
    assert r2.status_code == 200

    # 3rd request exceeds limit
    r3 = rate_client.post("/api/v1/explanations", json=payload)
    assert r3.status_code == 429
    assert r3.json()["error"]["code"] == "RATE_LIMITED"
    assert "Retry-After" in r3.headers
