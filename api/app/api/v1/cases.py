"""API endpoints for Investigation Cases, Notes, Attachments, and Timeline."""

from fastapi import APIRouter, Depends, Query, Response, status

from app.core.auth import CurrentUser, get_current_user
from app.core.errors import NotFoundError
from app.repositories import get_case_repository, get_note_repository
from app.repositories.case_repository import CaseRepository
from app.repositories.note_repository import NoteRepository
from app.schemas.cases import (
    AttachScanRequest,
    CaseDetailResponse,
    CaseNoteResponse,
    CaseResponse,
    CaseScanAttachmentResponse,
    CaseStatus,
    CreateCaseRequest,
    CreateNoteRequest,
    ListCasesResponse,
    UpdateCaseRequest,
    UpdateNoteRequest,
)
from app.utils.pagination import decode_cursor, encode_cursor

router = APIRouter(prefix="/cases", tags=["Investigation Cases"])


@router.post(
    "",
    response_model=CaseResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new investigation case",
)
def create_case_endpoint(
    payload: CreateCaseRequest,
    user: CurrentUser = Depends(get_current_user),
    case_repo: CaseRepository = Depends(get_case_repository),
) -> CaseResponse:
    """Create a new case, optionally associating initial scans owned by the user."""
    return case_repo.create_case(
        user_id=user.id,
        title=payload.title,
        description=payload.description,
        priority=payload.priority,
        scan_ids=payload.scan_ids,
    )


@router.get(
    "",
    response_model=ListCasesResponse,
    summary="List investigation cases",
)
def list_cases_endpoint(
    status: CaseStatus | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    cursor: str | None = Query(default=None),
    user: CurrentUser = Depends(get_current_user),
    case_repo: CaseRepository = Depends(get_case_repository),
) -> ListCasesResponse:
    """List cases owned by the authenticated user with cursor pagination."""
    cursor_data = decode_cursor(cursor)
    items, next_cursor_data = case_repo.list_cases(
        user_id=user.id,
        status=status,
        limit=limit,
        cursor=cursor_data,
    )

    next_cursor_str = None
    if next_cursor_data:
        next_cursor_str = encode_cursor(
            created_at=next_cursor_data.created_at,
            item_id=next_cursor_data.id,
        )

    return ListCasesResponse(items=items, next_cursor=next_cursor_str)


@router.get(
    "/{case_id}",
    response_model=CaseDetailResponse,
    summary="Retrieve full case details, attached scans, notes, and timeline",
)
def get_case_endpoint(
    case_id: str,
    user: CurrentUser = Depends(get_current_user),
    case_repo: CaseRepository = Depends(get_case_repository),
) -> CaseDetailResponse:
    """Fetch full case details. Returns 404 if case does not exist or belongs to another user."""
    c = case_repo.get_case(user_id=user.id, case_id=case_id)
    if not c:
        raise NotFoundError(f"Case '{case_id}' was not found.")
    return c


@router.patch(
    "/{case_id}",
    response_model=CaseResponse,
    summary="Update case metadata, status, or priority",
)
def update_case_endpoint(
    case_id: str,
    payload: UpdateCaseRequest,
    user: CurrentUser = Depends(get_current_user),
    case_repo: CaseRepository = Depends(get_case_repository),
) -> CaseResponse:
    """Update case fields."""
    updated = case_repo.update_case(
        user_id=user.id,
        case_id=case_id,
        title=payload.title,
        description=payload.description,
        status=payload.status,
        priority=payload.priority,
    )
    if not updated:
        raise NotFoundError(f"Case '{case_id}' was not found.")
    return updated


@router.delete(
    "/{case_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete an investigation case",
)
def delete_case_endpoint(
    case_id: str,
    user: CurrentUser = Depends(get_current_user),
    case_repo: CaseRepository = Depends(get_case_repository),
) -> Response:
    """Delete case dossier. Attached scans remain preserved in user history."""
    deleted = case_repo.delete_case(user_id=user.id, case_id=case_id)
    if not deleted:
        raise NotFoundError(f"Case '{case_id}' was not found.")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/{case_id}/scans",
    response_model=CaseScanAttachmentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Attach a scan to an investigation case",
)
def attach_scan_endpoint(
    case_id: str,
    payload: AttachScanRequest,
    user: CurrentUser = Depends(get_current_user),
    case_repo: CaseRepository = Depends(get_case_repository),
) -> CaseScanAttachmentResponse:
    """Link a user-owned scan to an investigation case. Returns 409 if already linked."""
    return case_repo.attach_scan(
        user_id=user.id,
        case_id=case_id,
        scan_id=payload.scan_id,
    )


@router.delete(
    "/{case_id}/scans/{scan_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Detach a scan from an investigation case",
)
def detach_scan_endpoint(
    case_id: str,
    scan_id: str,
    user: CurrentUser = Depends(get_current_user),
    case_repo: CaseRepository = Depends(get_case_repository),
) -> Response:
    """Unlink a scan from a case."""
    detached = case_repo.detach_scan(user_id=user.id, case_id=case_id, scan_id=scan_id)
    if not detached:
        raise NotFoundError(
            f"Attachment between case '{case_id}' and scan '{scan_id}' was not found."
        )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/{case_id}/notes",
    response_model=CaseNoteResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add a plain-text note to a case",
)
def add_note_endpoint(
    case_id: str,
    payload: CreateNoteRequest,
    user: CurrentUser = Depends(get_current_user),
    note_repo: NoteRepository = Depends(get_note_repository),
) -> CaseNoteResponse:
    """Append a timestamped plain-text investigation note."""
    return note_repo.add_note(user_id=user.id, case_id=case_id, body=payload.body)


@router.patch(
    "/{case_id}/notes/{note_id}",
    response_model=CaseNoteResponse,
    summary="Update a case note",
)
def update_note_endpoint(
    case_id: str,
    note_id: str,
    payload: UpdateNoteRequest,
    user: CurrentUser = Depends(get_current_user),
    note_repo: NoteRepository = Depends(get_note_repository),
) -> CaseNoteResponse:
    """Update note content."""
    updated = note_repo.update_note(
        user_id=user.id,
        case_id=case_id,
        note_id=note_id,
        body=payload.body,
    )
    if not updated:
        raise NotFoundError(f"Note '{note_id}' was not found on case '{case_id}'.")
    return updated


@router.delete(
    "/{case_id}/notes/{note_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a case note",
)
def delete_note_endpoint(
    case_id: str,
    note_id: str,
    user: CurrentUser = Depends(get_current_user),
    note_repo: NoteRepository = Depends(get_note_repository),
) -> Response:
    """Delete an investigation note."""
    deleted = note_repo.delete_note(user_id=user.id, case_id=case_id, note_id=note_id)
    if not deleted:
        raise NotFoundError(f"Note '{note_id}' was not found on case '{case_id}'.")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
