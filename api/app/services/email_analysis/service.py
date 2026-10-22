"""Email scanning and analysis orchestration service."""

import hashlib
import re
import uuid
from datetime import UTC, datetime
from typing import Any

from app.core.config import Settings
from app.schemas.scans import MessageChannel, MessageScanRequest, UrlScanRequest
from app.schemas.threat_report import (
    AIExplanation,
    AIStatus,
    Assessment,
    Confidence,
    ExplanationGeneratedBy,
    ExternalLookupStatus,
    InputInfo,
    Processing,
    RecommendedAction,
    RiskLevel,
    ScanType,
    ScoreContribution,
    ThreatReport,
)
from app.services.email_analysis.headers import extract_header_summary
from app.services.email_analysis.indicators import evaluate_email_indicators
from app.services.email_analysis.parser import BoundedEmailParser
from app.services.reputation_service import get_reputation_service
from app.services.scan_service import scan_message, scan_url

URL_REGEX = re.compile(r'https?://[^\s<>"\')]+', re.IGNORECASE)


async def analyze_email_content(
    raw_bytes: bytes,
    settings: Settings,
    include_reputation: bool = True,
    request_id: str = "req_email_scan",
) -> ThreatReport:
    """Analyze email source and produce standardized ThreatReport."""
    start_time = datetime.now(UTC)

    # 1. Parse MIME
    msg, plain_body, html_body, attachments = BoundedEmailParser.parse_raw(raw_bytes)
    header_summary = extract_header_summary(msg)

    # 2. Extract and analyze URLs
    raw_urls = URL_REGEX.findall(plain_body) + URL_REGEX.findall(html_body)
    # Deduplicate while preserving order
    seen_urls = set()
    extracted_urls: list[str] = []
    for u in raw_urls:
        clean = u.rstrip(".,;!?:")
        if clean not in seen_urls:
            seen_urls.add(clean)
            extracted_urls.append(clean)

    url_findings: list[dict[str, Any]] = []
    max_url_score = 0
    reputation_service = get_reputation_service()

    for target_url in extracted_urls[:10]:  # Cap first 10 URLs
        try:
            url_rep = scan_url(UrlScanRequest(url=target_url), settings, request_id)
            url_score = url_rep.assessment.risk_score
            url_risk_level = url_rep.assessment.risk_level
            indicator_cnt = len([i for i in url_rep.indicators if i.triggered])
        except Exception:
            url_score = 0
            url_risk_level = RiskLevel.INCONCLUSIVE
            indicator_cnt = 0

        # Check reputation if enabled
        rep_status = "not_checked"
        if include_reputation and settings.FEATURE_REPUTATION:
            try:
                rep_res, _, rep_pts = await reputation_service.evaluate_url(target_url)
                if rep_pts > 0:
                    url_score = min(100, url_score + rep_pts)
                rep_status = rep_res[0].status if rep_res else "not_checked"
            except Exception:
                rep_status = "failed"

        max_url_score = max(max_url_score, url_score)
        url_findings.append(
            {
                "url": target_url,
                "risk_score": url_score,
                "risk_level": url_risk_level,
                "reputation_status": rep_status,
                "indicator_count": indicator_cnt,
            }
        )

    # 3. Analyze Body Text
    body_to_analyze = plain_body or re.sub(r"<[^>]+>", " ", html_body)
    msg_rep = None
    if body_to_analyze.strip():
        try:
            msg_rep = scan_message(
                MessageScanRequest(
                    message=body_to_analyze[: settings.MAX_MESSAGE_CHARS],
                    channel=MessageChannel.EMAIL_BODY,
                ),
                settings,
                request_id,
            )
        except Exception:
            msg_rep = None

    # 4. Analyze Email Specific Indicators
    email_indicators, email_score = evaluate_email_indicators(
        header_summary=header_summary,
        plain_body=plain_body,
        html_body=html_body,
        attachments=attachments,
    )

    # Combine indicators
    msg_indicators = [ind for ind in msg_rep.indicators if ind.triggered] if msg_rep else []
    all_indicators = email_indicators + msg_indicators

    # Combine scores with deterministic ceiling
    msg_score = msg_rep.assessment.risk_score if msg_rep else 0
    combined_score = min(100, email_score + int(msg_score * 0.4) + int(max_url_score * 0.5))

    # Determine risk level
    if combined_score >= 80:
        risk_level = RiskLevel.CRITICAL
    elif combined_score >= 55:
        risk_level = RiskLevel.HIGH
    elif combined_score >= 25:
        risk_level = RiskLevel.MEDIUM
    elif combined_score > 0:
        risk_level = RiskLevel.LOW
    else:
        risk_level = RiskLevel.INCONCLUSIVE

    # Build input summary
    subject = header_summary.get("subject") or "No Subject"
    from_sender = header_summary.get("from") or "Unknown Sender"
    display_summary = f"Email: '{subject}' from {from_sender}"
    input_hash = hashlib.sha256(raw_bytes).hexdigest()

    now_iso = datetime.now(UTC).isoformat()
    duration_ms = int((datetime.now(UTC) - start_time).total_seconds() * 1000)

    # Recommended Actions
    actions: list[RecommendedAction] = []
    if risk_level in [RiskLevel.CRITICAL, RiskLevel.HIGH]:
        actions.append(
            RecommendedAction(
                action_id="ACT_DO_NOT_CLICK_LINKS",
                priority=1,
                text="Do not click any embedded links or open attachments in this email.",
                applies_to_levels=[RiskLevel.CRITICAL, RiskLevel.HIGH],
            )
        )
        actions.append(
            RecommendedAction(
                action_id="ACT_REPORT_PHISHING",
                priority=2,
                text="Report this email to your organization's security team or email provider as phishing.",
                applies_to_levels=[RiskLevel.CRITICAL, RiskLevel.HIGH],
            )
        )
    elif risk_level == RiskLevel.MEDIUM:
        actions.append(
            RecommendedAction(
                action_id="ACT_VERIFY_OUT_OF_BAND",
                priority=1,
                text="Verify the sender's identity through a trusted alternative contact channel before responding.",
                applies_to_levels=[RiskLevel.MEDIUM],
            )
        )
    else:
        actions.append(
            RecommendedAction(
                action_id="ACT_REMAIN_VIGILANT",
                priority=1,
                text="No severe phishing indicators detected. Continue monitoring for unexpected follow-up communications.",
                applies_to_levels=[RiskLevel.LOW, RiskLevel.INCONCLUSIVE],
            )
        )

    # Explanation
    explanation = AIExplanation(
        summary=(
            f"Email from '{from_sender}' was assessed as {risk_level.value.upper()} risk ({combined_score}/100 pts). "
            f"Found {len(all_indicators)} indicator clue(s), {len(attachments)} attachment(s), and {len(url_findings)} embedded link(s)."
        ),
        key_findings=[
            {
                "text": ind.title,
                "indicator_ids": [ind.indicator_id],
            }
            for ind in all_indicators[:4]
        ]
        or [
            {
                "text": "No overt impersonation or threat indicators detected in header structure",
                "indicator_ids": ["EMAIL_CLEAN"],
            }
        ],
        user_guidance="Scrutinize sender addresses and do not open untrusted attachments.",
        uncertainty_notes="SPF/DKIM/DMARC statuses are reported as found in headers and not independently re-verified.",
        generated_by=ExplanationGeneratedBy.DETERMINISTIC_FALLBACK,
        validated=True,
    )

    report = ThreatReport(
        report_id=str(uuid.uuid4()),
        schema_version="1.0",
        scan_type=ScanType.EMAIL,
        created_at=now_iso,
        input=InputInfo(
            display_value=display_summary[:200],
            normalized_value=from_sender[:200],
            input_hash=input_hash,
            input_length=len(raw_bytes),
        ),
        assessment=Assessment(
            risk_score=combined_score,
            risk_level=risk_level,
            confidence=Confidence.HIGH if len(all_indicators) >= 2 else Confidence.MEDIUM,
            verdict_label=f"{risk_level.value.capitalize()} Risk",
            limitations=[
                "Authentication headers are reported values, not cryptographically re-verified by CIPHER AI."
            ],
        ),
        indicators=all_indicators,
        score_breakdown=[
            ScoreContribution(
                indicator_id=ind.indicator_id,
                points=25,
                reason=ind.description[:100],
                evidence_kind=ind.evidence_kind,
                capped=False,
            )
            for ind in all_indicators
        ],
        external_evidence=[],
        ai_explanation=explanation,
        recommended_actions=actions,
        engine_version="1.0.0",
        processing=Processing(
            duration_ms=duration_ms,
            ai_status=AIStatus.FALLBACK_USED,
            external_lookup_status=ExternalLookupStatus.COMPLETE
            if include_reputation
            else ExternalLookupStatus.NOT_ATTEMPTED,
        ),
        email_summary=header_summary,
        extracted_urls=url_findings,
        attachments=attachments,
    )

    return report
