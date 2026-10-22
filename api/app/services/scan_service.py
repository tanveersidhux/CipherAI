"""Scan service orchestrating validation, analysis, scoring, and report generation."""

import logging
import time
from typing import Any

from app.ai.fallback import build_deterministic_explanation
from app.core.config import Settings
from app.core.errors import InputTooLargeError, ValidationError
from app.engine.message_analyzer import analyze_message
from app.engine.normalization import (
    make_display_preview,
    normalize_text,
    sha256_hex,
)
from app.engine.report_builder import build_report
from app.engine.scoring import score_findings
from app.engine.url_analyzer import analyze_url
from app.engine.url_validation import build_defanged, parse_and_validate_url
from app.schemas.scans import MessageScanRequest, UrlScanRequest
from app.schemas.threat_report import AIExplanation, ScanType, ThreatReport

logger = logging.getLogger("cipherai.engine")


def explanation_for(assessment_data: dict[str, Any], indicators_data: list) -> AIExplanation:
    """Seam for explanation generation; Phase 05 wraps the LLM pipeline around this."""
    return build_deterministic_explanation(assessment_data, indicators_data)


def scan_url(request: UrlScanRequest, settings: Settings, request_id: str = "-") -> ThreatReport:
    """Validate and analyze a submitted URL, producing a ThreatReport."""
    start_time = time.monotonic()
    raw_url = request.url

    # 1. Length validation before parsing
    if len(raw_url.strip()) > settings.MAX_URL_CHARS:
        raise InputTooLargeError(
            f"URL length exceeds maximum limit of {settings.MAX_URL_CHARS} characters.",
            field="url",
            max_allowed=settings.MAX_URL_CHARS,
        )

    # 2. Strict URL parsing, syntax validation, and defanging
    parsed = parse_and_validate_url(raw_url, max_chars=settings.MAX_URL_CHARS)
    display_value = build_defanged(parsed)
    normalized_value = parsed.normalized
    input_hash = sha256_hex(normalized_value)
    input_length = len(parsed.original)

    # 3. Analyze URL indicators with error containment
    has_analyzer_error = False
    inconclusive_reason = ""
    try:
        findings = analyze_url(parsed)
    except Exception as exc:
        logger.exception("URL analyzer internal error [req_id=%s]: %s", request_id, exc)
        findings = []
        has_analyzer_error = True
        inconclusive_reason = "Internal heuristic analyzer error encountered."

    # 4. Score indicators
    scoring_outcome = score_findings(
        findings=findings,
        scan_type=ScanType.URL,
        input_length=input_length,
        is_inconclusive_override=has_analyzer_error,
        inconclusive_reason=inconclusive_reason,
    )

    # 5. Generate explanation
    assessment_dict = {
        "risk_level": scoring_outcome.risk_level.value,
        "risk_score": scoring_outcome.risk_score,
    }
    indicators_dict = [ind.model_dump() for ind in scoring_outcome.indicators]
    explanation = explanation_for(assessment_dict, indicators_dict)

    # 6. Build final report
    duration_ms = max(0, int((time.monotonic() - start_time) * 1000))
    report = build_report(
        scan_type=ScanType.URL,
        display_value=display_value,
        normalized_value=normalized_value,
        input_hash=input_hash,
        input_length=input_length,
        scoring_outcome=scoring_outcome,
        explanation=explanation,
        duration_ms=duration_ms,
    )

    # 7. Log metadata only (never log raw input)
    logger.info(
        "Scan completed: type=url level=%s score=%d indicators=%d duration=%dms hash_prefix=%s [req_id=%s]",
        report.assessment.risk_level.value,
        report.assessment.risk_score,
        len(report.indicators),
        duration_ms,
        input_hash[:12],
        request_id,
    )

    return report


def scan_message(
    request: MessageScanRequest, settings: Settings, request_id: str = "-"
) -> ThreatReport:
    """Normalize and analyze a submitted message, producing a ThreatReport."""
    start_time = time.monotonic()
    raw_message = request.message

    # 1. Length validation
    if len(raw_message.strip()) > settings.MAX_MESSAGE_CHARS:
        raise InputTooLargeError(
            f"Message length exceeds maximum limit of {settings.MAX_MESSAGE_CHARS} characters.",
            field="message",
            max_allowed=settings.MAX_MESSAGE_CHARS,
        )

    # 2. Reject empty or whitespace-only message
    if not raw_message.strip():
        raise ValidationError(
            "Message cannot be empty or contain only whitespace.",
            details=[{"field": "message", "issue": "empty_input"}],
        )

    # 3. Unicode normalization and sanitization
    normalized_text, anomalies = normalize_text(raw_message)
    input_length = len(raw_message)
    input_hash = sha256_hex(normalized_text)
    display_value = make_display_preview(normalized_text, max_len=200)

    # 4. Message analysis with error containment
    has_analyzer_error = False
    inconclusive_reason = ""
    findings = []

    try:
        findings, entities = analyze_message(normalized_text, request.channel.value)
    except Exception as exc:
        logger.exception("Message analyzer internal error [req_id=%s]: %s", request_id, exc)
        has_analyzer_error = True
        inconclusive_reason = "Internal heuristic analyzer error encountered."

    # 5. Score indicators
    scoring_outcome = score_findings(
        findings=findings,
        scan_type=ScanType.MESSAGE,
        input_length=input_length,
        is_inconclusive_override=has_analyzer_error,
        inconclusive_reason=inconclusive_reason,
    )

    # 6. Generate explanation
    assessment_dict = {
        "risk_level": scoring_outcome.risk_level.value,
        "risk_score": scoring_outcome.risk_score,
    }
    indicators_dict = [ind.model_dump() for ind in scoring_outcome.indicators]
    explanation = explanation_for(assessment_dict, indicators_dict)

    # 7. Build final report
    duration_ms = max(0, int((time.monotonic() - start_time) * 1000))
    report = build_report(
        scan_type=ScanType.MESSAGE,
        display_value=display_value,
        normalized_value=normalized_text,
        input_hash=input_hash,
        input_length=input_length,
        scoring_outcome=scoring_outcome,
        explanation=explanation,
        duration_ms=duration_ms,
    )

    # 8. Log metadata only (never log raw input)
    logger.info(
        "Scan completed: type=message level=%s score=%d indicators=%d duration=%dms hash_prefix=%s [req_id=%s]",
        report.assessment.risk_level.value,
        report.assessment.risk_score,
        len(report.indicators),
        duration_ms,
        input_hash[:12],
        request_id,
    )

    return report
