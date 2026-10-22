"""Security and authorization isolation tests across users.

Verifies that:
1. User A cannot read, update, or delete User B's scans, cases, or notes.
2. Cross-user attempts return 404 (not 403) to prevent leaking resource existence.
3. User A cannot attach User B's scan to User A's case.
"""

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

USER_A = "isolation-user-alice"
USER_B = "isolation-user-bob"


def setup_isolation_env(settings: Settings):
    store = InMemoryStore()
    case_repo = FakeCaseRepository(store)
    scan_repo = FakeScanRepository(store)
    note_repo = FakeNoteRepository(store)

    app = create_app(settings=settings)
    app.dependency_overrides[get_case_repository] = lambda: case_repo
    app.dependency_overrides[get_scan_repository] = lambda: scan_repo
    app.dependency_overrides[get_note_repository] = lambda: note_repo

    client = TestClient(app)
    return client, scan_repo, case_repo, note_repo


def test_cross_user_isolation(default_settings: Settings) -> None:
    client, scan_repo, case_repo, note_repo = setup_isolation_env(default_settings)

    create_token(sub=USER_A)
    token_b = create_token(sub=USER_B)

    headers_b = {"Authorization": f"Bearer {token_b}"}

    # Alice creates a scan
    r_a = scan_url(UrlScanRequest(url="https://alice-private-threat.com"), default_settings)
    alice_scan_id = scan_repo.save_scan(USER_A, r_a, title="Alice's Private Scan")

    # Alice creates a case
    alice_case = case_repo.create_case(USER_A, title="Alice's Case", scan_ids=[alice_scan_id])
    alice_case_id = alice_case.id

    # Alice adds a note
    alice_note = note_repo.add_note(USER_A, alice_case_id, "Alice confidential finding")
    alice_note_id = alice_note.id

    # Bob creates a case for himself
    bob_case = case_repo.create_case(USER_B, title="Bob's Case")
    bob_case_id = bob_case.id

    # 1. Bob attempts to GET Alice's scan -> 404
    resp = client.get(f"/api/v1/scans/{alice_scan_id}", headers=headers_b)
    assert resp.status_code == 404

    # 2. Bob attempts to PATCH Alice's scan -> 404
    resp = client.patch(
        f"/api/v1/scans/{alice_scan_id}",
        json={"title": "Hacked Title"},
        headers=headers_b,
    )
    assert resp.status_code == 404

    # 3. Bob attempts to DELETE Alice's scan -> 404
    resp = client.delete(f"/api/v1/scans/{alice_scan_id}", headers=headers_b)
    assert resp.status_code == 404

    # 4. Bob attempts to GET Alice's case -> 404
    resp = client.get(f"/api/v1/cases/{alice_case_id}", headers=headers_b)
    assert resp.status_code == 404

    # 5. Bob attempts to attach Alice's scan to Bob's case -> 404
    resp = client.post(
        f"/api/v1/cases/{bob_case_id}/scans",
        json={"scan_id": alice_scan_id},
        headers=headers_b,
    )
    assert resp.status_code == 404

    # 6. Bob attempts to add note to Alice's case -> 404
    resp = client.post(
        f"/api/v1/cases/{alice_case_id}/notes",
        json={"body": "Injected unauthorized note"},
        headers=headers_b,
    )
    assert resp.status_code == 404

    # 7. Bob attempts to update Alice's note -> 404
    resp = client.patch(
        f"/api/v1/cases/{alice_case_id}/notes/{alice_note_id}",
        json={"body": "Tampered note"},
        headers=headers_b,
    )
    assert resp.status_code == 404

    # 8. Bob attempts to delete Alice's note -> 404
    resp = client.delete(
        f"/api/v1/cases/{alice_case_id}/notes/{alice_note_id}",
        headers=headers_b,
    )
    assert resp.status_code == 404
