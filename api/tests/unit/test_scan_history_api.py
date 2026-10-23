"""API tests for Scan History, search, pagination, update, delete, and re-scan."""

from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app
from app.repositories import get_scan_repository
from app.repositories.fakes import FakeScanRepository, InMemoryStore
from app.schemas.scans import MessageScanRequest, UrlScanRequest
from app.schemas.threat_report import ScanType
from app.services.scan_service import scan_message, scan_url
from tests.unit.test_auth import create_token

USER_A = "user-history-test-a"
USER_B = "user-history-test-b"


def setup_history_app(settings: Settings) -> tuple[TestClient, FakeScanRepository]:
    store = InMemoryStore()
    repo = FakeScanRepository(store)
    app = create_app(settings=settings)
    app.dependency_overrides[get_scan_repository] = lambda: repo
    client = TestClient(app)
    return client, repo


def test_list_scans_requires_auth(default_settings: Settings) -> None:
    client, _ = setup_history_app(default_settings)
    resp = client.get("/api/v1/scans")
    assert resp.status_code == 401
    assert resp.json()["error"]["code"] == "UNAUTHENTICATED"


def test_list_scans_and_filters(default_settings: Settings) -> None:
    client, repo = setup_history_app(default_settings)
    token = create_token(sub=USER_A)
    headers = {"Authorization": f"Bearer {token}"}

    # Seed 3 scans for User A
    r1 = scan_url(UrlScanRequest(url="https://phishing-site.com"), default_settings)
    s1_id = repo.save_scan(USER_A, r1, title="Phish URL", is_pinned=True, tags=["lure", "urgent"])

    r2 = scan_url(UrlScanRequest(url="https://legit-domain.org"), default_settings)
    repo.save_scan(USER_A, r2, title="Safe URL", is_pinned=False, tags=["safe"])

    r3 = scan_message(MessageScanRequest(message="Urgent wire transfer needed"), default_settings)
    s3_id = repo.save_scan(USER_A, r3, title="Wire Scam", is_pinned=False, tags=["scam"])

    # Also seed an email scan
    email_report = r3.model_copy(deep=True)
    email_report.scan_type = ScanType.EMAIL
    email_report.report_id = "test-email-report-uuid"
    email_report.input.display_value = "Invoice #9823 overdue payment"
    email_report.input.normalized_value = "invoice #9823 overdue payment"
    s4_id = repo.save_scan(USER_A, email_report, title="Suspicious Invoice Email", is_pinned=False, tags=["email"])

    # 1. List all
    resp = client.get("/api/v1/scans", headers=headers)
    assert resp.status_code == 200
    items = resp.json()["items"]
    assert len(items) == 4

    # 2. Filter by scan_type=message
    resp = client.get("/api/v1/scans?scan_type=message", headers=headers)
    assert resp.status_code == 200
    items = resp.json()["items"]
    assert len(items) == 1
    assert items[0]["id"] == s3_id

    # 2b. Filter by scan_type=email
    resp = client.get("/api/v1/scans?scan_type=email", headers=headers)
    assert resp.status_code == 200
    items = resp.json()["items"]
    assert len(items) == 1
    assert items[0]["id"] == s4_id

    # 3. Filter by tag=lure
    resp = client.get("/api/v1/scans?tag=lure", headers=headers)
    assert resp.status_code == 200
    items = resp.json()["items"]
    assert len(items) == 1
    assert items[0]["id"] == s1_id

    # 4. Filter by pinned=true
    resp = client.get("/api/v1/scans?pinned=true", headers=headers)
    assert resp.status_code == 200
    items = resp.json()["items"]
    assert len(items) == 1
    assert items[0]["id"] == s1_id

    # 5. Search text q=wire
    resp = client.get("/api/v1/scans?q=wire", headers=headers)
    assert resp.status_code == 200
    items = resp.json()["items"]
    assert len(items) == 1
    assert items[0]["title"] == "Wire Scam"


def test_scan_detail_update_delete_and_rescan(default_settings: Settings) -> None:
    client, repo = setup_history_app(default_settings)
    token = create_token(sub=USER_A)
    headers = {"Authorization": f"Bearer {token}"}

    r1 = scan_url(UrlScanRequest(url="https://malicious-endpoint.com/login"), default_settings)
    s1_id = repo.save_scan(USER_A, r1, title="Initial Title")

    # Detail
    resp = client.get(f"/api/v1/scans/{s1_id}", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["report_id"] == r1.report_id
    assert data["assessment"]["risk_score"] == r1.assessment.risk_score

    # Update
    resp = client.patch(
        f"/api/v1/scans/{s1_id}",
        json={"title": "Updated Threat Name", "is_pinned": True, "tags": ["investigated"]},
        headers=headers,
    )
    assert resp.status_code == 200
    assert resp.json()["title"] == "Updated Threat Name"
    assert resp.json()["is_pinned"] is True
    assert "investigated" in resp.json()["tags"]

    # Re-scan
    resp = client.post(f"/api/v1/scans/{s1_id}/rescan", headers=headers)
    assert resp.status_code == 201
    rescan_data = resp.json()
    assert "scan" in rescan_data
    assert "comparison" in rescan_data
    assert rescan_data["comparison"]["new_risk_score"] >= 0

    # Delete
    resp = client.delete(f"/api/v1/scans/{s1_id}", headers=headers)
    assert resp.status_code == 204

    # Detail now 404
    resp = client.get(f"/api/v1/scans/{s1_id}", headers=headers)
    assert resp.status_code == 404
