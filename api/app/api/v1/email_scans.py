"""Email scanning endpoints accepting raw email text or .eml files."""

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field

from app.core.auth import CurrentUser, get_optional_user
from app.core.config import Settings, get_settings
from app.core.errors import InputTooLargeError, ValidationError
from app.core.rate_limit import rate_limit_dependency
from app.repositories import get_scan_repository
from app.repositories.scan_repository import ScanRepository
from app.schemas.threat_report import ThreatReport
from app.services.email_analysis.service import analyze_email_content
from app.services.persistence_service import handle_scan_persistence

router = APIRouter(prefix="/scans", tags=["Scans"])


class EmailScanJsonRequest(BaseModel):
    raw_email: str = Field(min_length=1, max_length=1_048_576)
    include_reputation: bool = True


@router.post(
    "/email",
    response_model=ThreatReport,
    dependencies=[Depends(rate_limit_dependency)],
    summary="Scan and analyze raw email source or uploaded .eml file",
)
async def scan_email_endpoint(
    request: Request,
    body: EmailScanJsonRequest | None = None,
    settings: Settings = Depends(get_settings),
    user: CurrentUser | None = Depends(get_optional_user),
    scan_repo: ScanRepository = Depends(get_scan_repository),
) -> ThreatReport:
    """Analyze raw email text and extract header, link, and attachment telemetry."""
    if not settings.FEATURE_EMAIL_ANALYSIS:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Email analysis feature is disabled in configuration.",
        )

    content_type = request.headers.get("content-type", "")
    raw_bytes: bytes

    if "multipart/form-data" in content_type:
        form = await request.form()
        uploaded_file = form.get("file")
        if not uploaded_file or not hasattr(uploaded_file, "read"):
            raise ValidationError("A valid .eml file must be provided under field 'file'.")
        raw_bytes = await uploaded_file.read()
    elif body and body.raw_email:
        raw_bytes = body.raw_email.encode("utf-8")
    else:
        # Fallback to reading raw body
        raw_bytes = await request.body()
        if not raw_bytes:
            raise ValidationError("Either 'raw_email' or a multipart .eml file is required.")

    if len(raw_bytes) > settings.EMAIL_MAX_BYTES:
        raise InputTooLargeError(
            f"Email size ({len(raw_bytes)} bytes) exceeds the {settings.EMAIL_MAX_BYTES} byte limit."
        )

    include_reputation = body.include_reputation if body else True
    report = await analyze_email_content(
        raw_bytes=raw_bytes,
        settings=settings,
        include_reputation=include_reputation,
        request_id=getattr(request.state, "request_id", "req_email_scan"),
    )

    return handle_scan_persistence(
        report=report,
        user=user,
        client_request_id=request.headers.get("Idempotency-Key"),
        scan_repo=scan_repo,
    )
