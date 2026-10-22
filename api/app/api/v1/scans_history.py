"""API Endpoints for Scan History, Search, Pagination, Detail, and Re-scan."""

from typing import Literal

from fastapi import APIRouter, Depends, Query, Response, status

from app.core.auth import CurrentUser, get_current_user
from app.core.config import Settings, get_settings
from app.core.errors import NotFoundError
from app.repositories import get_scan_repository
from app.repositories.scan_repository import ScanRepository
from app.schemas.reputation import ReputationCheckItem, ReputationRefreshResponse
from app.schemas.scan_history import (
    ListScansResponse,
    RescanComparison,
    RescanResponse,
    ScanSummaryItem,
    StoredScanDetail,
    UpdateScanRequest,
)
from app.schemas.scans import MessageScanRequest, UrlScanRequest
from app.services.scan_service import scan_message, scan_url
from app.utils.pagination import decode_cursor, encode_cursor

router = APIRouter(prefix="/scans", tags=["Scan History"])


@router.get(
    "",
    response_model=ListScansResponse,
    summary="List and filter authenticated user's scan history",
)
def list_scans_endpoint(
    limit: int = Query(default=20, ge=1, le=100),
    cursor: str | None = Query(default=None),
    scan_type: Literal["url", "message"] | None = Query(default=None),
    risk_level: list[str] | None = Query(default=None),
    from_date: str | None = Query(default=None, alias="from"),
    to_date: str | None = Query(default=None, alias="to"),
    q: str | None = Query(default=None, max_length=200),
    tag: str | None = Query(default=None, max_length=32),
    pinned: bool | None = Query(default=None),
    user: CurrentUser = Depends(get_current_user),
    repo: ScanRepository = Depends(get_scan_repository),
) -> ListScansResponse:
    """Retrieve cursor-paginated scan history with composite filtering and search."""
    cursor_data = decode_cursor(cursor)

    items, next_cursor_data = repo.list_scans(
        user_id=user.id,
        limit=limit,
        cursor=cursor_data,
        scan_type=scan_type,
        risk_levels=risk_level,
        from_date=from_date,
        to_date=to_date,
        search=q,
        tag=tag,
        pinned=pinned,
    )

    next_cursor_str = None
    if next_cursor_data:
        next_cursor_str = encode_cursor(
            created_at=next_cursor_data.created_at,
            item_id=next_cursor_data.id,
        )

    return ListScansResponse(items=items, next_cursor=next_cursor_str)


@router.get(
    "/{scan_id}",
    response_model=StoredScanDetail,
    summary="Retrieve full scan detail report",
)
def get_scan_endpoint(
    scan_id: str,
    user: CurrentUser = Depends(get_current_user),
    repo: ScanRepository = Depends(get_scan_repository),
) -> StoredScanDetail:
    """Fetch complete persisted threat report. Returns 404 if not found or owned by another user."""
    scan = repo.get_scan(user_id=user.id, scan_id=scan_id)
    if not scan:
        raise NotFoundError(f"Scan '{scan_id}' was not found.")
    return scan


@router.patch(
    "/{scan_id}",
    response_model=ScanSummaryItem,
    summary="Update scan title, pinned state, or tags",
)
def update_scan_endpoint(
    scan_id: str,
    payload: UpdateScanRequest,
    user: CurrentUser = Depends(get_current_user),
    repo: ScanRepository = Depends(get_scan_repository),
) -> ScanSummaryItem:
    """Update user-modifiable properties of a scan report."""
    updated = repo.update_scan(
        user_id=user.id,
        scan_id=scan_id,
        title=payload.title,
        is_pinned=payload.is_pinned,
        tags=payload.tags,
    )
    if not updated:
        raise NotFoundError(f"Scan '{scan_id}' was not found.")
    return updated


@router.delete(
    "/{scan_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a scan from history",
)
def delete_scan_endpoint(
    scan_id: str,
    user: CurrentUser = Depends(get_current_user),
    repo: ScanRepository = Depends(get_scan_repository),
) -> Response:
    """Permanently delete a scan and its associated evidence and case attachments."""
    deleted = repo.delete_scan(user_id=user.id, scan_id=scan_id)
    if not deleted:
        raise NotFoundError(f"Scan '{scan_id}' was not found.")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/{scan_id}/rescan",
    response_model=RescanResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Re-scan an existing threat target and compare risk changes",
)
def rescan_endpoint(
    scan_id: str,
    user: CurrentUser = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
    repo: ScanRepository = Depends(get_scan_repository),
) -> RescanResponse:
    """Re-scan target from stored normalized input using existing SSRF-protected scanning path."""
    original = repo.get_scan(user_id=user.id, scan_id=scan_id)
    if not original:
        raise NotFoundError(f"Original scan '{scan_id}' was not found.")

    # Re-execute scan using existing deterministic pipeline
    if original.scan_type == "url":
        url_input = original.input.normalized_value or original.input.display_value
        new_report = scan_url(UrlScanRequest(url=url_input), settings=settings)
    else:
        msg_input = original.input.normalized_value or original.input.display_value
        new_report = scan_message(MessageScanRequest(message=msg_input), settings=settings)

    # Persist the new scan linked to the original
    new_scan_id = repo.save_scan(
        user_id=user.id,
        report=new_report,
        title=f"Re-scan: {original.title or original.input.display_value}",
        rescan_of_scan_id=scan_id,
        tags=original.tags,
    )
    new_report.scan_id = new_scan_id
    new_report.persistence_status = "saved"

    # Identify changed indicators
    old_ids = {ind.indicator_id for ind in original.indicators if ind.triggered}
    new_ids = {ind.indicator_id for ind in new_report.indicators if ind.triggered}
    changed_indicators = sorted(old_ids.symmetric_difference(new_ids))

    comparison = RescanComparison(
        previous_risk_score=original.assessment.risk_score,
        new_risk_score=new_report.assessment.risk_score,
        previous_risk_level=original.assessment.risk_level,
        new_risk_level=new_report.assessment.risk_level,
        changed_indicators=changed_indicators,
    )

    return RescanResponse(scan=new_report, comparison=comparison)


@router.post(
    "/{scan_id}/reputation/refresh",
    response_model=ReputationRefreshResponse,
    summary="Refresh external threat intelligence reputation for a stored scan",
)
async def refresh_reputation_endpoint(
    scan_id: str,
    user: CurrentUser = Depends(get_current_user),
    repo: ScanRepository = Depends(get_scan_repository),
) -> ReputationRefreshResponse:
    """Re-query active external reputation providers for a stored target URL."""
    from app.services.reputation_service import get_reputation_service

    original = repo.get_scan(user_id=user.id, scan_id=scan_id)
    if not original:
        raise NotFoundError(f"Scan '{scan_id}' was not found.")

    target_url = original.input.normalized_value or original.input.display_value
    reputation_service = get_reputation_service()
    results, evidence, score_contrib = await reputation_service.evaluate_url(target_url)

    items = [
        ReputationCheckItem(
            provider=r.provider,
            status=r.status,
            categories=r.categories,
            checked_at=r.checked_at,
            expires_at=r.expires_at,
            summary=r.summary,
        )
        for r in results
    ]

    new_score = min(100, original.assessment.risk_score + score_contrib)

    return ReputationRefreshResponse(
        scan_id=scan_id,
        results=items,
        risk_score=new_score,
        risk_level=original.assessment.risk_level,
        reputation_contribution=score_contrib,
    )
