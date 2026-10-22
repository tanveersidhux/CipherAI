"""Export API endpoints for threat scans and investigation cases."""

from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status

from app.core.auth import CurrentUser, get_current_user
from app.core.config import Settings, get_settings
from app.core.errors import NotFoundError
from app.repositories import get_case_repository, get_scan_repository
from app.repositories.case_repository import CaseRepository
from app.repositories.scan_repository import ScanRepository
from app.services.export_service import get_export_service

router = APIRouter(tags=["Exports"])


@router.get(
    "/scans/{scan_id}/export",
    summary="Export scan assessment as JSON or sanitized CSV",
    response_class=Response,
)
def export_scan_endpoint(
    scan_id: str,
    format: Literal["json", "csv"] = Query(default="json"),
    user: CurrentUser = Depends(get_current_user),
    repo: ScanRepository = Depends(get_scan_repository),
    settings: Settings = Depends(get_settings),
) -> Response:
    """Download stored threat report in JSON or spreadsheet-safe CSV format."""
    if not settings.FEATURE_EXPORT:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Export feature is disabled in configuration.",
        )

    scan = repo.get_scan(user_id=user.id, scan_id=scan_id)
    if not scan:
        raise NotFoundError(f"Scan '{scan_id}' was not found.")

    export_service = get_export_service()
    headers = {"X-Content-Type-Options": "nosniff"}

    if format == "json":
        content = export_service.export_scan_json(scan)
        headers["Content-Disposition"] = f'attachment; filename="cipher_scan_{scan_id[:8]}.json"'
        return Response(content=content, media_type="application/json", headers=headers)
    else:
        content = export_service.export_scan_csv(scan)
        headers["Content-Disposition"] = f'attachment; filename="cipher_scan_{scan_id[:8]}.csv"'
        return Response(content=content, media_type="text/csv; charset=utf-8", headers=headers)


@router.get(
    "/cases/{case_id}/export",
    summary="Export investigation case dossier as JSON or CSV",
    response_class=Response,
)
def export_case_endpoint(
    case_id: str,
    format: Literal["json", "csv"] = Query(default="json"),
    include_notes: bool = Query(default=True),
    user: CurrentUser = Depends(get_current_user),
    repo: CaseRepository = Depends(get_case_repository),
    settings: Settings = Depends(get_settings),
) -> Response:
    """Download investigation case dossier in JSON or CSV format."""
    if not settings.FEATURE_EXPORT:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Export feature is disabled in configuration.",
        )

    case_detail = repo.get_case(user_id=user.id, case_id=case_id)
    if not case_detail:
        raise NotFoundError(f"Case '{case_id}' was not found.")

    export_service = get_export_service()
    headers = {"X-Content-Type-Options": "nosniff"}

    if format == "json":
        content = export_service.export_case_json(case_detail)
        headers["Content-Disposition"] = f'attachment; filename="cipher_case_{case_id[:8]}.json"'
        return Response(content=content, media_type="application/json", headers=headers)
    else:
        content = export_service.export_case_csv(case_detail, include_notes=include_notes)
        headers["Content-Disposition"] = f'attachment; filename="cipher_case_{case_id[:8]}.csv"'
        return Response(content=content, media_type="text/csv; charset=utf-8", headers=headers)
