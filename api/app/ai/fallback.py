"""Deterministic template-based explanation generator used when AI is disabled or as fallback."""

from typing import Any

from app.schemas.threat_report import (
    AIExplanation,
    ExplanationGeneratedBy,
    KeyFinding,
)


def build_deterministic_explanation(
    assessment_data: dict[str, Any],
    indicators: list[dict[str, Any]],
) -> AIExplanation:
    """Build a schema-compliant AIExplanation using deterministic rule templates."""
    risk_level = assessment_data.get("risk_level", "inconclusive")
    risk_score = assessment_data.get("risk_score", 0)

    # 1. Summary based on level
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

    # 2. Key findings citing real indicator IDs present in the report
    key_findings: list[KeyFinding] = []
    for ind in indicators:
        ind_id = ind.get("indicator_id")
        title = ind.get("title", ind_id)
        severity = ind.get("severity", "medium")
        if ind_id:
            key_findings.append(
                KeyFinding(
                    text=f"{title} ({severity} severity finding).",
                    indicator_ids=[ind_id],
                )
            )
        if len(key_findings) >= 5:
            break

    # 3. Uncertainty notes
    uncertainty_notes = (
        "Analysis was conducted offline without destination network fetching or real-time reputation database lookups. "
        "Novel zero-day campaigns or benign internal resources may not be fully represented."
    )

    return AIExplanation(
        summary=summary[:600],
        key_findings=key_findings,
        user_guidance=guidance,
        uncertainty_notes=uncertainty_notes,
        generated_by=ExplanationGeneratedBy.DETERMINISTIC_FALLBACK,
        model=None,
        validated=True,
    )
