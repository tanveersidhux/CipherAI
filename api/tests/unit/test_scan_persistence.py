"""Unit tests for scan persistence orchestration and idempotency."""

from unittest.mock import MagicMock

from fastapi.testclient import TestClient

from app.core.auth import CurrentUser
from app.core.config import Settings
from app.main import create_app
from app.repositories import get_scan_repository
from app.repositories.fakes import FakeScanRepository, InMemoryStore
from app.schemas.scans import UrlScanRequest
from app.services.persistence_service import handle_scan_persistence
from app.services.scan_service import scan_url


def test_guest_scan_returns_not_saved_guest(default_settings: Settings) -> None:
    app = create_app(settings=default_settings)
    client = TestClient(app)

    response = client.post("/api/v1/scans/url", json={"url": "https://example.com/safe"})
    assert response.status_code == 200
    data = response.json()
    assert data["persistence_status"] == "not_saved_guest"
    assert data["scan_id"] is None
    assert data["saved_at"] is None


def test_authenticated_scan_persists_successfully(default_settings: Settings) -> None:
    store = InMemoryStore()
    repo = FakeScanRepository(store)
    app = create_app(settings=default_settings)
    app.dependency_overrides[get_scan_repository] = lambda: repo

    client = TestClient(app)
    # Generate token
    from tests.unit.test_auth import create_token

    token = create_token(sub="persisted-user-001")

    response = client.post(
        "/api/v1/scans/url",
        json={"url": "https://phishing-lure.net/login"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["persistence_status"] == "saved"
    assert data["scan_id"] is not None
    assert data["saved_at"] is not None

    # Check store has it
    saved = repo.get_scan(user_id="persisted-user-001", scan_id=data["scan_id"])
    assert saved is not None
    assert saved.report_id == data["report_id"]


def test_persistence_failure_returns_save_failed_safely(default_settings: Settings) -> None:
    mock_repo = MagicMock()
    mock_repo.save_scan.side_effect = RuntimeError("Simulated DB connection failure")

    report = scan_url(
        UrlScanRequest(url="https://example.com"),
        settings=default_settings,
    )
    user = CurrentUser(id="user-fail-1")
    result = handle_scan_persistence(report=report, user=user, scan_repo=mock_repo)

    assert result.persistence_status == "save_failed"
    assert result.scan_id is None
    assert result.saved_at is None
    # Report itself is still intact
    assert result.assessment.risk_level is not None
