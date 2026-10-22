"""Metrics and telemetry endpoints for operational observability.

Provides:
- GET /api/v1/metrics (in-memory system snapshot: HTTP, scans, AI, reputation, errors)
- POST /api/v1/scans/{scan_id}/feedback (false-positive / false-negative quality reporting)
"""

import logging
from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, Depends, Header, HTTPException, status

from app.core.config import Settings, get_settings
from app.core.metrics import metrics
from app.schemas.feedback import ScanFeedbackRequest, ScanFeedbackResponse

logger = logging.getLogger("cipher.metrics")
router = APIRouter(tags=["Monitoring & Telemetry"])


def verify_metrics_access(
    settings: Settings = Depends(get_settings),
    x_metrics_token: str | None = Header(None, alias="X-Metrics-Token"),
    authorization: str | None = Header(None),
) -> None:
    """Protect metrics endpoint in production if METRICS_AUTH_TOKEN is configured."""
    if not settings.METRICS_AUTH_TOKEN:
        return

    expected = settings.METRICS_AUTH_TOKEN.get_secret_value().strip()
    if not expected:
        return

    # Check direct header or Bearer token
    bearer = ""
    if authorization and authorization.lower().startswith("bearer "):
        bearer = authorization[7:].strip()

    provided = x_metrics_token or bearer
    if provided != expected:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Valid metrics authentication token required.",
        )


@router.get(
    "/metrics",
    summary="Application Metrics Snapshot",
    description="Returns aggregate operational telemetry including HTTP throughput, latency, scan statistics, AI request outcomes, and error counters.",
    dependencies=[Depends(verify_metrics_access)],
)
async def get_metrics_endpoint() -> dict[str, Any]:
    """Return bounded-cardinality in-memory operational telemetry snapshot."""
    return metrics.get_snapshot()


@router.post(
    "/scans/{scan_id}/feedback",
    response_model=ScanFeedbackResponse,
    summary="Submit Scan Quality Feedback",
    description="Enables security analysts and users to report perceived false positives or false negatives for continuous engine improvement.",
)
async def submit_scan_feedback(
    scan_id: str,
    feedback: ScanFeedbackRequest,
) -> ScanFeedbackResponse:
    """Record scan quality assessment feedback without storing sensitive user input."""
    metrics.record_feedback(feedback.feedback_type)
    logger.info(
        "Scan quality feedback recorded",
        extra={
            "scan_id": scan_id,
            "feedback_type": feedback.feedback_type,
            "has_comments": bool(feedback.comments),
        },
    )
    return ScanFeedbackResponse(
        status="recorded",
        scan_id=scan_id,
        feedback_type=feedback.feedback_type,
        recorded_at=datetime.now(UTC),
    )
