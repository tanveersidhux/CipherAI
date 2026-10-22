"""Privacy and account data deletion endpoints."""

from fastapi import APIRouter, Depends, Response, status
from pydantic import BaseModel, ConfigDict, Field

from app.core.auth import CurrentUser, get_current_user
from app.core.errors import ValidationError
from app.repositories import (
    get_in_memory_store,
)

router = APIRouter(prefix="/me", tags=["Privacy Controls"])


class DeleteDataRequest(BaseModel):
    """Confirmation payload for complete data erasure."""

    model_config = ConfigDict(extra="forbid")
    confirm: str = Field(..., description="Must equal the literal string 'DELETE'.")


@router.delete(
    "/data",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Permanently delete all data associated with current user",
)
def delete_all_user_data_endpoint(
    payload: DeleteDataRequest,
    user: CurrentUser = Depends(get_current_user),
) -> Response:
    """Cascade purge all user scans, evidence, explanations, cases, notes, tags, and settings."""
    if payload.confirm != "DELETE":
        raise ValidationError(
            "Confirmation string must match 'DELETE' exactly.",
            details=[{"field": "confirm", "issue": "confirmation_mismatch"}],
        )

    store = get_in_memory_store()
    with store.lock:
        # Delete user scans
        scan_ids = [sid for sid, s in store.scans.items() if s["user_id"] == user.id]
        for sid in scan_ids:
            del store.scans[sid]

        # Delete user cases
        case_ids = [cid for cid, c in store.cases.items() if c["user_id"] == user.id]
        for cid in case_ids:
            del store.cases[cid]

        # Delete user case_scans
        junctions = [k for k, v in store.case_scans.items() if v["user_id"] == user.id]
        for k in junctions:
            del store.case_scans[k]

        # Delete user case_notes
        notes = [nid for nid, n in store.case_notes.items() if n["user_id"] == user.id]
        for nid in notes:
            del store.case_notes[nid]

        # Delete user case_events
        store.case_events = [e for e in store.case_events if e["user_id"] != user.id]

        # Delete user settings
        if user.id in store.user_settings:
            del store.user_settings[user.id]

    return Response(status_code=status.HTTP_204_NO_CONTENT)
