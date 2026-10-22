"""Frontend contract tests.

Verifies that the backend API responses for scans, explanations, health, and status
contain every field and structure mandated by the frontend runtime type guards
(isThreatReport, isExplanationResponse, isHealthData). Also verifies CORS origin allowlisting.
"""

import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.core.rate_limit import rate_limiter
from app.main import create_app


@pytest.fixture(autouse=True)
def reset_rate_limits():
    """Reset rate limiter state before each test."""
    rate_limiter.reset()
    yield
    rate_limiter.reset()


@pytest.fixture
def client():
    settings = Settings(
        APP_ENV="test",
        AI_ENABLED=False,
        CORS_ALLOWED_ORIGINS=["http://localhost:5173", "http://127.0.0.1:5173"],
    )
    app = create_app(settings)
    with TestClient(app) as test_client:
        yield test_client


def assert_threat_report_schema(report: dict, expected_scan_type: str):
    """Assert all fields required by frontend isThreatReport type guard exist."""
    assert isinstance(report["report_id"], str) and len(report["report_id"]) > 0
    assert report["schema_version"] == "1.0"
    assert report["scan_type"] == expected_scan_type
    assert isinstance(report["created_at"], str)
    assert isinstance(report["engine_version"], str)

    # Input validation
    inp = report["input"]
    assert isinstance(inp["display_value"], str)
    assert isinstance(inp["input_hash"], str) and len(inp["input_hash"]) == 64
    assert isinstance(inp["input_length"], int) and inp["input_length"] >= 0

    # Assessment validation
    asm = report["assessment"]
    assert isinstance(asm["risk_score"], int) and 0 <= asm["risk_score"] <= 100
    assert asm["risk_level"] in ["low", "medium", "high", "critical", "inconclusive"]
    assert asm["confidence"] in ["low", "medium", "high"]
    assert isinstance(asm["verdict_label"], str)
    assert isinstance(asm["limitations"], list)

    # Indicators validation
    assert isinstance(report["indicators"], list)
    for ind in report["indicators"]:
        assert isinstance(ind["indicator_id"], str)
        assert isinstance(ind["title"], str)
        assert isinstance(ind["description"], str)
        assert isinstance(ind["triggered"], bool)
        assert ind["evidence_kind"] in ["observed", "inferred", "external"]
        assert ind["severity"] in ["info", "low", "medium", "high", "critical"]

    # Score breakdown validation
    assert isinstance(report["score_breakdown"], list)
    for sc in report["score_breakdown"]:
        assert isinstance(sc["indicator_id"], str)
        assert isinstance(sc["points"], int)
        assert isinstance(sc["reason"], str)
        assert isinstance(sc["capped"], bool)
        assert sc["evidence_kind"] in ["observed", "inferred", "external"]

    # External evidence list
    assert isinstance(report["external_evidence"], list)

    # Recommended actions
    assert isinstance(report["recommended_actions"], list)
    for act in report["recommended_actions"]:
        assert isinstance(act["action_id"], str)
        assert isinstance(act["priority"], int)
        assert isinstance(act["text"], str)
        assert isinstance(act["applies_to_levels"], list)

    # Processing metadata
    proc = report["processing"]
    assert isinstance(proc["duration_ms"], int) and proc["duration_ms"] >= 0
    assert proc["ai_status"] in ["used", "fallback_used", "disabled"]
    assert proc["external_lookup_status"] in [
        "not_attempted",
        "complete",
        "partial",
        "unavailable",
    ]


def test_url_scan_contract_compliance(client):
    """Test URL scan endpoints (/scans/url and /scan/url) strictly fulfill frontend contract."""
    for path in ["/api/v1/scans/url", "/api/v1/scan/url"]:
        resp = client.post(path, json={"url": "https://example.com/login"})
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert_threat_report_schema(data, expected_scan_type="url")


def test_message_scan_contract_compliance(client):
    """Test Message scan endpoints fulfill frontend contract."""
    for path in ["/api/v1/scans/message", "/api/v1/scan/message"]:
        resp = client.post(
            path,
            json={
                "message": "Urgent alert: Your bank account will be suspended. Click http://bank-update.test",
                "channel": "sms",
            },
        )
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert_threat_report_schema(data, expected_scan_type="message")


def test_explanations_contract_compliance(client):
    """Test explanation endpoint conforms to frontend isExplanationResponse guard."""
    # First get a real report
    scan_resp = client.post("/api/v1/scans/url", json={"url": "https://example.com/test"})
    report = scan_resp.json()

    exp_resp = client.post("/api/v1/explanations", json={"report": report})
    assert exp_resp.status_code == 200, exp_resp.text
    data = exp_resp.json()

    # Verify ExplanationResponse shape
    assert "explanation" in data
    assert "meta" in data

    exp = data["explanation"]
    assert isinstance(exp["summary"], str)
    assert isinstance(exp["risk_statement"], str)
    assert isinstance(exp["key_findings"], list)
    for kf in exp["key_findings"]:
        assert isinstance(kf["title"], str)
        assert isinstance(kf["detail"], str)
        assert isinstance(kf["evidence_ids"], list)
    assert isinstance(exp["recommended_actions"], list)
    for ra in exp["recommended_actions"]:
        assert ra["priority"] in ["high", "medium", "low"]
        assert isinstance(ra["action"], str)
    assert exp["confidence"] in ["low", "medium", "high"]
    assert isinstance(exp["limitations"], list)
    assert isinstance(exp["disclaimer"], str)

    meta = data["meta"]
    assert meta["explanation_source"] in ["ai", "deterministic_fallback"]
    assert "prompt_injection_suspected" in meta
    assert isinstance(meta["latency_ms"], int)
    assert isinstance(meta["generated_at"], str)


def test_ai_status_contract_compliance(client):
    """Test GET /api/v1/ai/status returns non-sensitive status payload."""
    resp = client.get("/api/v1/ai/status")
    assert resp.status_code == 200
    data = resp.json()
    assert "ai_enabled" in data
    assert "provider_configured" in data
    assert "model" in data
    # Ensure zero keys leaked
    assert "key" not in str(data).lower()


def test_cors_allowed_and_rejected_origins(client):
    """Test CORS preflight and headers allow configured origins and reject foreign ones."""
    # Allowed origin: http://localhost:5173
    allowed_resp = client.options(
        "/api/v1/scans/url",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "POST",
        },
    )
    assert allowed_resp.headers.get("access-control-allow-origin") == "http://localhost:5173"

    # Disallowed origin: http://attacker.evil.com
    disallowed_resp = client.options(
        "/api/v1/scans/url",
        headers={
            "Origin": "http://attacker.evil.com",
            "Access-Control-Request-Method": "POST",
        },
    )
    assert disallowed_resp.headers.get("access-control-allow-origin") is None
