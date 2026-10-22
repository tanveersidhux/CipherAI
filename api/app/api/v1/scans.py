"""Scan API endpoints for suspicious URLs and scam messages."""

from fastapi import APIRouter, Depends, Request

from app.core.config import Settings, get_settings
from app.core.rate_limit import rate_limit_dependency
from app.schemas.scans import MessageScanRequest, UrlScanRequest
from app.schemas.threat_report import ThreatReport
from app.services.scan_service import scan_message, scan_url

router = APIRouter(prefix="/scans", tags=["Scans"])


@router.post(
    "/url",
    response_model=ThreatReport,
    dependencies=[Depends(rate_limit_dependency)],
    summary="Scan and analyze a suspicious URL",
)
def analyze_url_endpoint(
    scan_req: UrlScanRequest,
    request: Request,
    settings: Settings = Depends(get_settings),
) -> ThreatReport:
    """Analyze a suspicious URL and produce a deterministic ThreatReport."""
    request_id = getattr(request.state, "request_id", "-")
    return scan_url(scan_req, settings, request_id=request_id)


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
) -> ThreatReport:
    """Analyze a suspicious scam message and produce a deterministic ThreatReport."""
    request_id = getattr(request.state, "request_id", "-")
    return scan_message(scan_req, settings, request_id=request_id)
