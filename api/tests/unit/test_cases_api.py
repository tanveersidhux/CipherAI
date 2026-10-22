"""API tests for investigation cases, attachments, and audit timeline."""

from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app
from app.repositories import (
    get_case_repository,
    get_note_repository,
    get_scan_repository,
)
from app.repositories.fakes import (
    FakeCaseRepository,
    FakeNoteRepository,
    FakeScanRepository,
    InMemoryStore,
)
from app.schemas.scans import UrlScanRequest
from app.services.scan_service import scan_url
from tests.unit.test_auth import create_token

USER_ID = "case-test-user-01"


def setup_cases_app(
    settings: Settings,
) -> tuple[TestClient, FakeCaseRepository, FakeScanRepository]:
    store = InMemoryStore()
    case_repo = FakeCaseRepository(store)
    scan_repo = FakeScanRepository(store)
    note_repo = FakeNoteRepository(store)

    app = create_app(settings=settings)
    app.dependency_overrides[get_case_repository] = lambda: case_repo
    app.dependency_overrides[get_scan_repository] = lambda: scan_repo
    app.dependency_overrides[get_note_repository] = lambda: note_repo

    client = TestClient(app)
    return client, case_repo, scan_repo


def test_case_lifecycle(default_settings: Settings) -> None:
    client, case_repo, scan_repo = setup_cases_app(default_settings)
    token = create_token(sub=USER_ID)
    headers = {"Authorization": f"Bearer {token}"}

    # Seed a scan
    r1 = scan_url(UrlScanRequest(url="https://spoofed-bank.com"), default_settings)
    s1_id = scan_repo.save_scan(USER_ID, r1, title="Bank Phish")

    # 1. Create case with initial scan
    create_resp = client.post(
        "/api/v1/cases",
        json={
            "title": "Incident #402 - Credential Harvest Campaign",
            "description": "Investigating spoofed banking pages",
            "priority": "high",
            "scan_ids": [s1_id],
        },
        headers=headers,
    )
    assert create_resp.status_code == 201
    case_data = create_resp.json()
    case_id = case_data["id"]
    assert case_data["scan_count"] == 1
    assert case_data["status"] == "open"

    # 2. List cases
    list_resp = client.get("/api/v1/cases?status=open", headers=headers)
    assert list_resp.status_code == 200
    assert len(list_resp.json()["items"]) == 1

    # 3. Case detail
    detail_resp = client.get(f"/api/v1/cases/{case_id}", headers=headers)
    assert detail_resp.status_code == 200
    detail = detail_resp.json()
    assert len(detail["scans"]) == 1
    assert detail["scans"][0]["id"] == s1_id
    assert len(detail["timeline"]) >= 1  # scan_attached event

    # 4. Duplicate attachment returns 409 Conflict
    dup_resp = client.post(
        f"/api/v1/cases/{case_id}/scans",
        json={"scan_id": s1_id},
        headers=headers,
    )
    assert dup_resp.status_code == 409
    assert dup_resp.json()["error"]["code"] == "CONFLICT"

    # 5. Detach scan
    detach_resp = client.delete(f"/api/v1/cases/{case_id}/scans/{s1_id}", headers=headers)
    assert detach_resp.status_code == 204

    # 6. Delete case and verify scan still exists
    del_resp = client.delete(f"/api/v1/cases/{case_id}", headers=headers)
    assert del_resp.status_code == 204

    # Verify scan was NOT deleted
    scan_check = scan_repo.get_scan(user_id=USER_ID, scan_id=s1_id)
    assert scan_check is not None
