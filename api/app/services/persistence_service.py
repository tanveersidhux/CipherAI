"""Persistence orchestration service.

Handles authenticated user scan persistence, guest bypass, idempotency tracking,
and defensive failure handling ensuring scan results are never dropped even if persistence fails.
"""

import logging
from datetime import UTC, datetime

from app.core.auth import CurrentUser
from app.repositories import get_scan_repository
from app.repositories.scan_repository import ScanRepository
from app.schemas.threat_report import ThreatReport

logger = logging.getLogger("cipher.persistence")


def handle_scan_persistence(
    report: ThreatReport,
    user: CurrentUser | None = None,
    client_request_id: str | None = None,
    title: str | None = None,
    scan_repo: ScanRepository | None = None,
) -> ThreatReport:
    """Orchestrate scan persistence according to user authentication state.

    - Unauthenticated guest: returns scan with persistence_status="not_saved_guest".
    - Authenticated user: attempts persistence; if error occurs, logs safely and returns
      persistence_status="save_failed" without breaking the response.
    """
    from app.core.metrics import metrics

    try:
        s_type = (
            report.scan_type.value if hasattr(report.scan_type, "value") else str(report.scan_type)
        )
        r_level = (
            report.assessment.risk_level.value
            if hasattr(report.assessment.risk_level, "value")
            else str(report.assessment.risk_level)
        )
        metrics.record_scan(s_type, r_level)
    except Exception:
        pass

    if user is None:
        report.persistence_status = "not_saved_guest"
        report.scan_id = None
        report.saved_at = None
        return report

    repo = scan_repo or get_scan_repository()

    try:
        scan_id = repo.save_scan(
            user_id=user.id,
            report=report,
            client_request_id=client_request_id,
            title=title,
        )
        report.scan_id = scan_id
        report.persistence_status = "saved"
        report.saved_at = datetime.now(UTC).isoformat()
    except Exception as exc:
        logger.warning(
            "Scan persistence failed for user %s: %s",
            user.id,
            exc,
            extra={"error_type": type(exc).__name__},
        )
        report.scan_id = None
        report.persistence_status = "save_failed"
        report.saved_at = None

    return report
