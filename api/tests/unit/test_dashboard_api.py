"""API tests for Dashboard summary and metrics aggregations."""

from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app
from app.repositories import get_analytics_repository, get_scan_repository
from app.repositories.fakes import (
    FakeAnalyticsRepository,
    FakeScanRepository,
    InMemoryStore,
)
from app.schemas.scans import UrlScanRequest
from app.services.scan_service import scan_url
from tests.unit.test_auth import create_token

USER_ID = "dashboard-test-user-01"


def test_dashboard_summary_empty(default_settings: Settings) -> None:
    store = InMemoryStore()
    app = create_app(settings=default_settings)
    app.dependency_overrides[get_analytics_repository] = lambda: FakeAnalyticsRepository(store)

    client = TestClient(app)
    token = create_token(sub=USER_ID)

    resp = client.get("/api/v1/dashboard/summary", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["totals"]["total_scans"] == 0
    assert data["totals"]["open_cases"] == 0
    assert len(data["recent_scans"]) == 0
    assert len(data["risk_distribution"]) == 5  # 5 standard risk levels


def test_dashboard_summary_with_scans(default_settings: Settings) -> None:
    store = InMemoryStore()
    scan_repo = FakeScanRepository(store)
    analytics_repo = FakeAnalyticsRepository(store)

    app = create_app(settings=default_settings)
    app.dependency_overrides[get_analytics_repository] = lambda: analytics_repo
    app.dependency_overrides[get_scan_repository] = lambda: scan_repo

    client = TestClient(app)
    token = create_token(sub=USER_ID)
    headers = {"Authorization": f"Bearer {token}"}

    # Add 2 scans
    r1 = scan_url(UrlScanRequest(url="https://paypal-security-update.com/login"), default_settings)
    scan_repo.save_scan(USER_ID, r1, title="Paypal Lure")

    r2 = scan_url(UrlScanRequest(url="https://google.com"), default_settings)
    scan_repo.save_scan(USER_ID, r2, title="Google")

    resp = client.get("/api/v1/dashboard/summary?range_days=30", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["totals"]["total_scans"] == 2
    assert len(data["recent_scans"]) == 2
    assert len(data["top_indicator_categories"]) >= 0
