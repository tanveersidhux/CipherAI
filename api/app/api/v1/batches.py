"""Batch scanning endpoints for asynchronous threat evaluation of URL lists."""

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status

from app.core.auth import CurrentUser, get_current_user
from app.core.config import Settings, get_settings
from app.core.errors import ConflictError, NotFoundError, ValidationError
from app.repositories import get_batch_repository, get_scan_repository
from app.repositories.batch_repository import BatchRepository
from app.repositories.scan_repository import ScanRepository
from app.schemas.batches import (
    BatchStatusResponse,
    CreateBatchRequest,
    CreateBatchResponse,
    ListBatchItemsResponse,
)
from app.services.batch_service import get_batch_service, parse_and_validate_batch_inputs

router = APIRouter(prefix="/batches", tags=["Batch Scanning"])


@router.post(
    "",
    status_code=status.HTTP_202_ACCEPTED,
    response_model=CreateBatchResponse,
    summary="Submit a batch of URLs for asynchronous scanning",
)
def create_batch_endpoint(
    req: CreateBatchRequest,
    background_tasks: BackgroundTasks,
    user: CurrentUser = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
    batch_repo: BatchRepository = Depends(get_batch_repository),
    scan_repo: ScanRepository = Depends(get_scan_repository),
) -> CreateBatchResponse:
    """Create a batch scan job and launch background item processing."""
    if not settings.FEATURE_BATCH:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Batch scanning feature is disabled in configuration.",
        )

    accepted, rejected = parse_and_validate_batch_inputs(
        urls=req.urls,
        csv_text=req.csv_text,
        max_items=settings.BATCH_MAX_ITEMS,
    )

    if not accepted:
        raise ValidationError(
            "No valid URLs were found in the submission. Check the rejected list for formatting details.",
            details=[{"field": f"line_{r.line}", "issue": r.reason} for r in rejected],
        )

    batch_id = batch_repo.create_batch(
        user_id=user.id,
        name=req.name or "Batch Scan",
        inputs=accepted,
    )

    # Schedule background processing
    batch_service = get_batch_service()
    background_tasks.add_task(
        batch_service.execute_batch_processing,
        user_id=user.id,
        batch_id=batch_id,
        inputs=accepted,
        settings=settings,
        batch_repo=batch_repo,
        scan_repo=scan_repo,
    )

    return CreateBatchResponse(
        id=batch_id,
        status="queued",
        total=len(accepted) + len(rejected),
        accepted=len(accepted),
        rejected=rejected,
    )


@router.get(
    "/{batch_id}",
    response_model=BatchStatusResponse,
    summary="Get status and aggregated metrics for a batch job",
)
def get_batch_endpoint(
    batch_id: str,
    user: CurrentUser = Depends(get_current_user),
    batch_repo: BatchRepository = Depends(get_batch_repository),
) -> BatchStatusResponse:
    """Retrieve current processing progress and risk-level breakdown of a batch."""
    batch = batch_repo.get_batch(user_id=user.id, batch_id=batch_id)
    if not batch:
        raise NotFoundError(f"Batch '{batch_id}' was not found.")
    return batch


@router.get(
    "/{batch_id}/items",
    response_model=ListBatchItemsResponse,
    summary="List items and scan outcomes for a batch job",
)
def list_batch_items_endpoint(
    batch_id: str,
    limit: int = Query(default=50, ge=1, le=100),
    cursor: str | None = Query(default=None),
    user: CurrentUser = Depends(get_current_user),
    batch_repo: BatchRepository = Depends(get_batch_repository),
) -> ListBatchItemsResponse:
    """List individual URL targets and their respective scan results."""
    # Ensure user owns batch
    batch = batch_repo.get_batch(user_id=user.id, batch_id=batch_id)
    if not batch:
        raise NotFoundError(f"Batch '{batch_id}' was not found.")

    items, next_cursor = batch_repo.list_batch_items(
        user_id=user.id, batch_id=batch_id, limit=limit, cursor=cursor
    )
    return ListBatchItemsResponse(items=items, next_cursor=next_cursor)


@router.post(
    "/{batch_id}/cancel",
    response_model=BatchStatusResponse,
    summary="Cancel a pending or running batch job",
)
def cancel_batch_endpoint(
    batch_id: str,
    user: CurrentUser = Depends(get_current_user),
    batch_repo: BatchRepository = Depends(get_batch_repository),
) -> BatchStatusResponse:
    """Cancel in-progress batch scanning."""
    batch = batch_repo.get_batch(user_id=user.id, batch_id=batch_id)
    if not batch:
        raise NotFoundError(f"Batch '{batch_id}' was not found.")

    if batch.status in ("completed", "cancelled", "failed"):
        raise ConflictError(f"Cannot cancel batch with status '{batch.status}'.")

    updated = batch_repo.set_batch_status(user_id=user.id, batch_id=batch_id, status="cancelled")
    if not updated:
        raise NotFoundError(f"Batch '{batch_id}' was not found.")
    return updated
