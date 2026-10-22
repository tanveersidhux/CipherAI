"""Deterministic template-based explanation generator used when AI is disabled or as fallback."""

from typing import Any

from app.ai.schemas import (
    ActionPriority,
    AIConfidence,
    AIExplanation,
    KeyFinding,
    RecommendedAction,
)
from app.schemas.threat_report import (
    AIExplanation as Phase04AIExplanation,
)
from app.schemas.threat_report import (
    ExplanationGeneratedBy as Phase04GeneratedBy,
)
from app.schemas.threat_report import (
    KeyFinding as Phase04KeyFinding,
)
from app.schemas.threat_report import (
    RiskLevel,
    ThreatReport,
)

STANDARD_DISCLAIMER = (
    "CIPHER AI evaluations are advisory security assessments based on deterministic heuristic analysis. "
    "Absence of detected threat markers does not guarantee the absence of threats. Always verify through official channels."
)

INCONCLUSIVE_LIMITATION = (
    "Input length or structural context is insufficient for conclusive threat pattern analysis."
)
OFFLINE_LIMITATION = "Offline lexical and structural analysis only; destination content was not retrieved or executed over the network."


def build_phase05_fallback_explanation(report: ThreatReport) -> AIExplanation:
    """Build a schema-valid Phase 05 AIExplanation purely from deterministic report findings."""
    risk_level = report.assessment.risk_level
    risk_score = report.assessment.risk_score

    # 1. Summary and Risk Statement
    if risk_level == RiskLevel.CRITICAL:
        summary = (
            f"CIPHER AI identified critical threat indicators with an aggregated risk score of {risk_score}/100. "
            "The evaluated asset exhibits severe markers characteristic of active credential phishing or direct scam operations."
        )
        risk_statement = "Severe active threat signatures detected; immediate protective precautions are required."
    elif risk_level == RiskLevel.HIGH:
        summary = (
            f"CIPHER AI detected high-risk deceptive patterns resulting in an aggregated risk score of {risk_score}/100. "
            "Multiple corroborated structural or lexical indicators strongly indicate malicious intent."
        )
        risk_statement = "High-confidence deceptive threat indicators observed. Interaction carries high risk of compromise."
    elif risk_level == RiskLevel.MEDIUM:
        summary = (
            f"CIPHER AI noted suspicious anomalies yielding a moderate risk score of {risk_score}/100. "
            "Syntactic or contextual characteristics warrant verification before trusting this communication."
        )
        risk_statement = "Moderate suspicion markers observed. Proceed with caution and verify authenticity independently."
    elif risk_level == RiskLevel.LOW:
        summary = (
            f"CIPHER AI detected only low-weight baseline heuristics resulting in a risk score of {risk_score}/100. "
            "No prominent known threat signatures were observed during offline lexical analysis."
        )
        risk_statement = "Low threat probability based on evaluated offline patterns. Standard vigilance applies."
    else:  # Inconclusive
        summary = "CIPHER AI reached an inconclusive evaluation due to minimal observable context or unparsable formatting."
        risk_statement = (
            "Evaluation is inconclusive due to insufficient observable threat indicators."
        )

    # 2. Key findings based on highest-scoring indicators
    # Sort indicators by score contribution descending
    score_map: dict[str, int] = {sc.indicator_id: sc.points for sc in report.score_breakdown}
    sorted_indicators = sorted(
        report.indicators,
        key=lambda ind: score_map.get(ind.indicator_id, 0),
        reverse=True,
    )

    key_findings: list[KeyFinding] = []
    for ind in sorted_indicators:
        pts = score_map.get(ind.indicator_id, 0)
        title = ind.title[:120]
        detail = (
            f"{ind.description} Observed: {ind.observed_value} ({pts} pts)."
            if ind.observed_value
            else f"{ind.description} ({pts} pts)."
        )
        key_findings.append(
            KeyFinding(
                title=title,
                detail=detail[:400],
                evidence_ids=[ind.indicator_id],
            )
        )
        if len(key_findings) >= 6:
            break

    # 3. Category-specific recommended actions
    actions: list[RecommendedAction] = []
    categories = {ind.category.value for ind in report.indicators}

    if risk_level in (RiskLevel.CRITICAL, RiskLevel.HIGH):
        actions.append(
            RecommendedAction(
                priority=ActionPriority.HIGH,
                action="Do not click links, open attachments, or submit credentials on this asset.",
            )
        )
        if (
            "credential_lure" in categories
            or "impersonation" in categories
            or "domain" in categories
        ):
            actions.append(
                RecommendedAction(
                    priority=ActionPriority.HIGH,
                    action="If login details were entered, immediately reset your password on the official verified service.",
                )
            )
        if "payment_request" in categories or "urgency" in categories:
            actions.append(
                RecommendedAction(
                    priority=ActionPriority.HIGH,
                    action="Do not transfer funds or purchase gift cards. Contact your financial institution immediately if shared.",
                )
            )
        actions.append(
            RecommendedAction(
                priority=ActionPriority.MEDIUM,
                action="Report this suspicious item to your organization's security team or the impersonated entity.",
            )
        )
    elif risk_level == RiskLevel.MEDIUM:
        actions.append(
            RecommendedAction(
                priority=ActionPriority.MEDIUM,
                action="Exercise caution and verify the sender or website through independent, authoritative channels.",
            )
        )
        actions.append(
            RecommendedAction(
                priority=ActionPriority.LOW,
                action="Check domain spelling and avoid submitting sensitive information until identity is confirmed.",
            )
        )
    elif risk_level == RiskLevel.INCONCLUSIVE:
        actions.append(
            RecommendedAction(
                priority=ActionPriority.MEDIUM,
                action="Do not assume safety; verify the link or message through an independent established channel.",
            )
        )
        actions.append(
            RecommendedAction(
                priority=ActionPriority.LOW,
                action="Avoid entering personal credentials on unverified or truncated addresses.",
            )
        )
    else:  # LOW
        actions.append(
            RecommendedAction(
                priority=ActionPriority.LOW,
                action="Maintain standard cybersecurity awareness and verify unrequested communications.",
            )
        )

    # 4. Confidence
    if risk_level == RiskLevel.INCONCLUSIVE or len(report.indicators) < 2:
        confidence = AIConfidence.LOW
    elif risk_level in (RiskLevel.CRITICAL, RiskLevel.HIGH) and len(report.indicators) >= 2:
        confidence = AIConfidence.HIGH
    else:
        confidence = AIConfidence.MEDIUM

    # 5. Limitations
    limitations = list(report.assessment.limitations)
    if not limitations:
        limitations = [OFFLINE_LIMITATION]

    return AIExplanation(
        summary=summary[:600],
        risk_statement=risk_statement,
        key_findings=key_findings,
        recommended_actions=actions,
        confidence=confidence,
        limitations=limitations,
        disclaimer=STANDARD_DISCLAIMER,
    )


# ---------------------------------------------------------------------------
# Backward Compatibility Seam for Phase 04 code/tests
# ---------------------------------------------------------------------------
def build_deterministic_explanation(
    assessment_data: dict[str, Any],
    indicators: list[dict[str, Any]],
) -> Phase04AIExplanation:
    """Build a Phase 04 schema-compliant AIExplanation for backward compatibility."""
    risk_level = assessment_data.get("risk_level", "inconclusive")
    risk_score = assessment_data.get("risk_score", 0)

    if risk_level == "critical":
        summary = (
            f"CIPHER AI identified critical threat indicators with an aggregated risk score of {risk_score}/100. "
            "The asset exhibits severe markers characteristic of active credential phishing or direct scam operations."
        )
        guidance = "Treat this asset as hostile. Do not interact, provide credentials, or follow external links."
    elif risk_level == "high":
        summary = (
            f"CIPHER AI detected high-risk deceptive patterns resulting in a risk score of {risk_score}/100. "
            "Multiple corroborated structural or lexical indicators suggest an intentional threat."
        )
        guidance = "Exercise extreme caution. Verify the communication independently before taking any requested action."
    elif risk_level == "medium":
        summary = (
            f"CIPHER AI noted suspicious patterns yielding a moderate risk score of {risk_score}/100. "
            "Anomalies were detected that warrant verification before trusting the asset."
        )
        guidance = "Proceed with caution. Check domain registrations and sender authenticity through official channels."
    elif risk_level == "low":
        summary = (
            f"CIPHER AI detected only low-weight baseline heuristics resulting in a risk score of {risk_score}/100. "
            "No strong known threat signatures were observed during offline lexical analysis."
        )
        guidance = "No urgent threat detected, but standard digital security vigilance should always be maintained."
    else:  # inconclusive
        summary = (
            "CIPHER AI reached an inconclusive evaluation due to insufficient observable context "
            "or unparsable input formatting."
        )
        guidance = (
            "Do not assume safety. Verify the asset through independent authoritative channels."
        )

    key_findings: list[Phase04KeyFinding] = []
    for ind in indicators:
        ind_id = ind.get("indicator_id")
        title = ind.get("title", ind_id)
        severity = ind.get("severity", "medium")
        if ind_id:
            key_findings.append(
                Phase04KeyFinding(
                    text=f"{title} ({severity} severity finding).",
                    indicator_ids=[ind_id],
                )
            )
        if len(key_findings) >= 5:
            break

    uncertainty_notes = (
        "Analysis was conducted offline without destination network fetching or real-time reputation database lookups. "
        "Novel zero-day campaigns or benign internal resources may not be fully represented."
    )

    return Phase04AIExplanation(
        summary=summary[:600],
        key_findings=key_findings,
        user_guidance=guidance,
        uncertainty_notes=uncertainty_notes,
        generated_by=Phase04GeneratedBy.DETERMINISTIC_FALLBACK,
        model=None,
        validated=True,
    )
