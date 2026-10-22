"""API tests for Case Notes creation, update, deletion, and length validation."""

from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app
from app.repositories import get_case_repository, get_note_repository
from app.repositories.fakes import (
    FakeCaseRepository,
    FakeNoteRepository,
    InMemoryStore,
)
from tests.unit.test_auth import create_token

USER_ID = "notes-test-user-01"


def setup_notes_app(settings: Settings) -> tuple[TestClient, str]:
    store = InMemoryStore()
    case_repo = FakeCaseRepository(store)
    note_repo = FakeNoteRepository(store)

    app = create_app(settings=settings)
    app.dependency_overrides[get_case_repository] = lambda: case_repo
    app.dependency_overrides[get_note_repository] = lambda: note_repo

    client = TestClient(app)
    c = case_repo.create_case(user_id=USER_ID, title="Notes Test Case")
    return client, c.id


def test_note_lifecycle(default_settings: Settings) -> None:
    client, case_id = setup_notes_app(default_settings)
    token = create_token(sub=USER_ID)
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Add note
    resp = client.post(
        f"/api/v1/cases/{case_id}/notes",
        json={"body": "Observed recurring C2 beacon pattern from analyzed payload."},
        headers=headers,
    )
    assert resp.status_code == 201
    note_data = resp.json()
    note_id = note_data["id"]
    assert note_data["body"] == "Observed recurring C2 beacon pattern from analyzed payload."

    # 2. Update note
    update_resp = client.patch(
        f"/api/v1/cases/{case_id}/notes/{note_id}",
        json={"body": "Updated: C2 beacon resolved to dynamic DNS provider."},
        headers=headers,
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["body"] == "Updated: C2 beacon resolved to dynamic DNS provider."

    # 3. Delete note
    del_resp = client.delete(f"/api/v1/cases/{case_id}/notes/{note_id}", headers=headers)
    assert del_resp.status_code == 204


def test_note_length_limit_enforced(default_settings: Settings) -> None:
    client, case_id = setup_notes_app(default_settings)
    token = create_token(sub=USER_ID)
    headers = {"Authorization": f"Bearer {token}"}

    oversized = "A" * 5001
    resp = client.post(
        f"/api/v1/cases/{case_id}/notes",
        json={"body": oversized},
        headers=headers,
    )
    assert resp.status_code == 422
