"""Insecure Direct Object Reference (IDOR) & multi-tenant isolation tests.

Verifies that users cannot access, modify, export, or delete cases, notes,
attachments, batches, or scan history records owned by another tenant.
"""

from datetime import UTC, datetime, timedelta

import jwt
import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app

JWT_SECRET = "idor-test-secret-key-32chars-xyz"


def make_token_for(user_id: str, email: str | None = None) -> str:
    now = datetime.now(UTC)
    payload = {
        "sub": user_id,
        "email": email or f"{user_id}@tenant.test",
        "aud": "authenticated",
        "exp": int((now + timedelta(hours=2)).timestamp()),
        "iat": int(now.timestamp()),
    }
    return jwt.encode(payload, key=JWT_SECRET, algorithm="HS256")


@pytest.fixture
def idor_client() -> TestClient:
    settings = Settings(
        APP_ENV="development",
        APP_VERSION="1.0.0",
        SUPABASE_JWT_SECRET=JWT_SECRET,
        FEATURE_REPUTATION=True,
        FEATURE_EMAIL_ANALYSIS=True,
        FEATURE_BATCH=True,
        FEATURE_EXPORT=True,
    )
    app = create_app(settings=settings)
    return TestClient(app, raise_server_exceptions=False)


def test_idor_case_isolation(idor_client: TestClient):
    """User B cannot view, modify, delete, attach notes to, or export User A's case."""
    user_a = "user-alice-1111"
    user_b = "user-bob-2222"

    token_a = make_token_for(user_a)
    token_b = make_token_for(user_b)

    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # 1. User A creates a sensitive case
    create_resp = idor_client.post(
        "/api/v1/cases",
        json={
            "title": "Alice's Secret Investigation",
            "description": "Confidential incident details",
        },
        headers=headers_a,
    )
    assert create_resp.status_code == 201
    case_id = create_resp.json()["id"]

    # 2. User B attempts to read User A's case
    read_resp = idor_client.get(f"/api/v1/cases/{case_id}", headers=headers_b)
    assert read_resp.status_code in (403, 404)

    # 3. User B attempts to modify User A's case
    patch_resp = idor_client.patch(
        f"/api/v1/cases/{case_id}",
        json={"title": "Hacked Title"},
        headers=headers_b,
    )
    assert patch_resp.status_code in (403, 404)

    # 4. User B attempts to add a note to User A's case
    note_resp = idor_client.post(
        f"/api/v1/cases/{case_id}/notes",
        json={"body": "Malicious injected note"},
        headers=headers_b,
    )
    assert note_resp.status_code in (403, 404)

    # 5. User B attempts to export User A's case
    export_resp = idor_client.get(
        f"/api/v1/cases/{case_id}/export?format=json",
        headers=headers_b,
    )
    assert export_resp.status_code in (403, 404)

    # 6. User B attempts to delete User A's case
    del_resp = idor_client.request("DELETE", f"/api/v1/cases/{case_id}", headers=headers_b)
    assert del_resp.status_code in (403, 404)

    # Verify User A's case is intact
    verify_resp = idor_client.get(f"/api/v1/cases/{case_id}", headers=headers_a)
    assert verify_resp.status_code == 200
    assert verify_resp.json()["title"] == "Alice's Secret Investigation"


def test_idor_batch_isolation(idor_client: TestClient):
    """User B cannot view or cancel User A's batch jobs."""
    user_a = "user-alice-batch"
    user_b = "user-bob-batch"

    token_a = make_token_for(user_a)
    token_b = make_token_for(user_b)

    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # 1. User A creates a batch job
    create_batch_resp = idor_client.post(
        "/api/v1/batches",
        json={"urls": ["https://corp.alice.com/login", "https://vault.alice.com"]},
        headers=headers_a,
    )
    assert create_batch_resp.status_code == 202
    batch_id = create_batch_resp.json()["id"]

    # 2. User B attempts to read User A's batch status
    get_batch_resp = idor_client.get(f"/api/v1/batches/{batch_id}", headers=headers_b)
    assert get_batch_resp.status_code in (403, 404)

    # 3. User B attempts to read User A's batch items
    get_items_resp = idor_client.get(f"/api/v1/batches/{batch_id}/items", headers=headers_b)
    assert get_items_resp.status_code in (403, 404)

    # 4. User B attempts to cancel User A's batch job
    cancel_resp = idor_client.post(f"/api/v1/batches/{batch_id}/cancel", headers=headers_b)
    assert cancel_resp.status_code in (403, 404)


def test_idor_scan_history_tenant_isolation(idor_client: TestClient):
    """User B's scan history never leaks User A's scans."""
    user_a = "user-alice-scans"
    user_b = "user-bob-scans"

    token_a = make_token_for(user_a)
    token_b = make_token_for(user_b)

    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # User A performs an authenticated scan
    idor_client.post(
        "/api/v1/scans/url",
        json={"url": "https://secret-alice-target.org"},
        headers=headers_a,
    )

    # User B queries their history
    hist_resp_b = idor_client.get("/api/v1/scans", headers=headers_b)
    assert hist_resp_b.status_code == 200
    items = hist_resp_b.json().get("items", [])

    # None of the items belong to user A or mention Alice's secret target
    for item in items:
        assert item.get("user_id") != user_a
        assert "secret-alice-target.org" not in str(item)
