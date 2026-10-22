"""Unit tests for Phase 11 monitoring, telemetry, health probes, and feedback."""

import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.core.metrics import MetricsCollector, normalize_metric_path
from app.main import create_app
from app.schemas.health import HealthResponse, LivenessResponse, ReadinessResponse


@pytest.fixture
def app_settings() -> Settings:
    return Settings(
        APP_ENV="test",
        METRICS_ENABLED=True,
    )


@pytest.fixture
def client(app_settings: Settings) -> TestClient:
    app = create_app(app_settings)
    return TestClient(app)


def test_normalize_metric_path():
    """Verify dynamic UUIDs and integers are normalized to bounded template tokens."""
    assert (
        normalize_metric_path("/api/v1/cases/1ee12b5b-6c69-4322-a3ff-526626b46109/notes")
        == "/api/v1/cases/{id}/notes"
    )
    assert normalize_metric_path("/api/v1/scans/42/feedback") == "/api/v1/scans/{id}/feedback"
    assert normalize_metric_path("/health?foo=bar") == "/health"
    assert normalize_metric_path("/") == "/"


def test_metrics_collector_operations():
    """Verify in-memory metric increments, latencies, and snapshot generation."""
    c = MetricsCollector()
    c.reset()

    c.record_http_request("GET", "/api/v1/health", 200, 15.5)
    c.record_http_request("POST", "/api/v1/scan/url", 200, 85.0)
    c.record_http_request("GET", "/api/v1/nonexistent", 404, 5.0)

    c.record_scan("url", "CRITICAL")
    c.record_scan("message", "LOW")

    c.record_gemini_call("success", 420.0)
    c.record_gemini_call("timeout", 12000.0)

    c.record_reputation_lookup("virustotal", "match_found")
    c.record_reputation_cache(hit=True)
    c.record_reputation_cache(hit=False)

    c.record_error("RATE_LIMITED")
    c.record_feedback("false_positive")

    snap = c.get_snapshot()

    assert snap["http"]["total_requests"] == 3
    assert snap["http"]["requests_by_endpoint_and_status"]["GET /api/v1/health 2xx"] == 1
    assert snap["http"]["requests_by_endpoint_and_status"]["GET /api/v1/nonexistent 4xx"] == 1

    assert snap["scans"]["total_scans"] == 2
    assert snap["scans"]["scans_by_type"]["url"] == 1
    assert snap["scans"]["scans_by_risk"]["CRITICAL"] == 1
    assert snap["scans"]["feedback"]["false_positive"] == 1

    assert snap["ai"]["total_requests"] == 2
    assert snap["ai"]["success_count"] == 1
    assert snap["ai"]["success_rate"] == 0.5
    assert snap["ai"]["avg_latency_ms"] == 6210.0

    assert snap["reputation"]["cache_hits"] == 1
    assert snap["reputation"]["cache_misses"] == 1
    assert snap["reputation"]["cache_hit_ratio"] == 0.5

    assert snap["errors"]["total_errors"] == 1
    assert snap["errors"]["errors_by_code"]["RATE_LIMITED"] == 1


def test_liveness_and_readiness_endpoints(client: TestClient):
    """Verify distinct liveness and readiness probes respond with valid schemas."""
    from app.api.v1.health import reset_health_cache

    reset_health_cache()

    # Liveness check (root and v1)
    resp_live = client.get("/health/live")
    assert resp_live.status_code == 200
    live_data = LivenessResponse.model_validate(resp_live.json())
    assert live_data.status == "alive"

    resp_v1_live = client.get("/api/v1/health/live")
    assert resp_v1_live.status_code == 200
    assert resp_v1_live.json()["status"] == "alive"

    # Readiness check (root and v1)
    resp_ready = client.get("/health/ready")
    assert resp_ready.status_code == 200
    ready_data = ReadinessResponse.model_validate(resp_ready.json())
    assert ready_data.status in ("ready", "degraded")

    # Full Health check
    resp_health = client.get("/health")
    assert resp_health.status_code == 200
    health_data = HealthResponse.model_validate(resp_health.json())
    assert health_data.status == "ok"


def test_metrics_api_endpoint(client: TestClient):
    """Verify GET /api/v1/metrics returns current application telemetry."""
    # Execute a request to generate traffic
    client.get("/health")

    resp = client.get("/api/v1/metrics")
    assert resp.status_code == 200
    data = resp.json()

    assert "http" in data
    assert "scans" in data
    assert "ai" in data
    assert "errors" in data
    assert data["http"]["total_requests"] >= 1


def test_metrics_api_token_protection():
    """Verify metrics endpoint enforces token authentication when configured."""
    from pydantic import SecretStr

    settings = Settings(
        APP_ENV="production",
        CORS_ALLOWED_ORIGINS="https://cipher.test",
        METRICS_AUTH_TOKEN=SecretStr("super-secret-metrics-key"),
    )
    app = create_app(settings)
    client = TestClient(app)

    # Missing token -> 401
    resp = client.get("/api/v1/metrics")
    assert resp.status_code == 401

    # Invalid token -> 401
    resp = client.get("/api/v1/metrics", headers={"X-Metrics-Token": "wrong-key"})
    assert resp.status_code == 401

    # Valid X-Metrics-Token -> 200
    resp = client.get("/api/v1/metrics", headers={"X-Metrics-Token": "super-secret-metrics-key"})
    assert resp.status_code == 200

    # Valid Bearer Authorization -> 200
    resp = client.get(
        "/api/v1/metrics", headers={"Authorization": "Bearer super-secret-metrics-key"}
    )
    assert resp.status_code == 200


def test_scan_feedback_submission(client: TestClient):
    """Verify scan feedback submission validates and records accurately."""
    payload = {
        "feedback_type": "false_positive",
        "comments": "This internal domain was incorrectly categorized as deceptive.",
    }
    resp = client.post("/api/v1/scans/test-scan-uuid-123/feedback", json=payload)
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "recorded"
    assert body["scan_id"] == "test-scan-uuid-123"
    assert body["feedback_type"] == "false_positive"

    # Check metrics recorded the feedback
    snap = client.get("/api/v1/metrics").json()
    assert snap["scans"]["feedback"]["false_positive"] >= 1
