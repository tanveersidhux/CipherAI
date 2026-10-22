"""Unit tests for Phase 08 feature flags endpoint."""

from fastapi.testclient import TestClient

from app.main import create_app


def test_get_features_endpoint():
    """Verify /api/v1/config/features returns feature flags and active providers without secrets."""
    app = create_app()
    client = TestClient(app)

    response = client.get("/api/v1/config/features")
    assert response.status_code == 200
    data = response.json()
    assert "reputation_providers" in data
    assert data["reputation"] is True
    assert data["email_analysis"] is True
    assert data["batch"] is True
    assert data["export"] is True
    # Ensure no secrets leak in public config
    assert "api_key" not in str(data).lower()
    assert "secret" not in str(data).lower()
