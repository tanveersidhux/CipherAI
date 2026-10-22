"""Scan API endpoints for suspicious URLs and scam messages."""

from fastapi import APIRouter, Depends, Request

from app.core.auth import CurrentUser, get_optional_user
from app.core.config import Settings, get_settings
from app.core.rate_limit import rate_limit_dependency
from app.repositories import get_scan_repository
from app.repositories.scan_repository import ScanRepository
from app.schemas.scans import MessageScanRequest, UrlScanRequest
from app.schemas.threat_report import ThreatReport
from app.services.persistence_service import handle_scan_persistence
from app.services.scan_service import scan_message, scan_url

router = APIRouter(prefix="/scans", tags=["Scans"])


@router.post(
    "/url",
    response_model=ThreatReport,
    dependencies=[Depends(rate_limit_dependency)],
    summary="Scan and analyze a suspicious URL",
)
async def analyze_url_endpoint(
    scan_req: UrlScanRequest,
    request: Request,
    settings: Settings = Depends(get_settings),
    user: CurrentUser | None = Depends(get_optional_user),
    scan_repo: ScanRepository = Depends(get_scan_repository),
) -> ThreatReport:
    from app.schemas.threat_report import (
        ExternalEvidence,
        ExternalEvidenceStatus,
        ExternalLookupStatus,
        RiskLevel,
    )
    from app.services.reputation_service import get_reputation_service

    request_id = getattr(request.state, "request_id", "-")
    idempotency_key = request.headers.get("Idempotency-Key")
    report = scan_url(scan_req, settings, request_id=request_id)

    if settings.FEATURE_REPUTATION:
        reputation_service = get_reputation_service()
        rep_results, rep_evidence, rep_score = await reputation_service.evaluate_url(scan_req.url)
        report.reputation_results = [r.model_dump(mode="json") for r in rep_results]

        for r in rep_results:
            st = (
                ExternalEvidenceStatus.FLAGGED
                if r.status == "match_found"
                else (
                    ExternalEvidenceStatus.NOT_FLAGGED
                    if r.status == "no_match"
                    else ExternalEvidenceStatus.UNKNOWN
                )
            )
            report.external_evidence.append(
                ExternalEvidence(
                    source=r.provider,
                    checked_at=r.checked_at.isoformat(),
                    status=st,
                    detail=", ".join(r.categories) if r.categories else None,
                    note=r.summary,
                )
            )

        if rep_score > 0:
            report.assessment.risk_score = min(100, report.assessment.risk_score + rep_score)
            if report.assessment.risk_score >= 80:
                report.assessment.risk_level = RiskLevel.CRITICAL
            elif report.assessment.risk_score >= 60:
                report.assessment.risk_level = RiskLevel.HIGH

        if rep_results:
            report.processing.external_lookup_status = ExternalLookupStatus.COMPLETE

    return handle_scan_persistence(
        report=report,
        user=user,
        client_request_id=idempotency_key,
        scan_repo=scan_repo,
    )


@router.post(
    "/message",
    response_model=ThreatReport,
    dependencies=[Depends(rate_limit_dependency)],
    summary="Scan and analyze a suspicious message",
)
def analyze_message_endpoint(
    scan_req: MessageScanRequest,
    request: Request,
    settings: Settings = Depends(get_settings),
    user: CurrentUser | None = Depends(get_optional_user),
    scan_repo: ScanRepository = Depends(get_scan_repository),
) -> ThreatReport:
    """Analyze a suspicious scam message and produce a deterministic ThreatReport."""
    request_id = getattr(request.state, "request_id", "-")
    idempotency_key = request.headers.get("Idempotency-Key")
    report = scan_message(scan_req, settings, request_id=request_id)
    return handle_scan_persistence(
        report=report,
        user=user,
        client_request_id=idempotency_key,
        scan_repo=scan_repo,
    )
