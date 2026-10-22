"""Deterministic explainable risk scoring with category caps and confidence calculations."""

from dataclasses import dataclass

from app.engine.indicators import TriggeredFinding
from app.engine.scoring_config import (
    BASELINE_LIMITATIONS,
    CATALOG,
    CATEGORY_CAPS,
    MANDATORY_LOW_LIMITATION,
)
from app.schemas.threat_report import (
    Confidence,
    Indicator,
    IndicatorCategory,
    RiskLevel,
    ScanType,
    ScoreContribution,
)


@dataclass(frozen=True)
class ScoringOutcome:
    risk_score: int
    risk_level: RiskLevel
    confidence: Confidence
    verdict_label: str
    limitations: list[str]
    score_breakdown: list[ScoreContribution]
    indicators: list[Indicator]


def score_findings(
    findings: list[TriggeredFinding],
    scan_type: ScanType,
    input_length: int,
    is_inconclusive_override: bool = False,
    inconclusive_reason: str = "Input length is insufficient for meaningful threat pattern analysis.",
) -> ScoringOutcome:
    """Compute score contributions, category caps, risk score, level, and confidence."""
    # 1. Inconclusive check
    if is_inconclusive_override or (input_length < 5 and not findings):
        limitations = [inconclusive_reason]
        return ScoringOutcome(
            risk_score=0,
            risk_level=RiskLevel.INCONCLUSIVE,
            confidence=Confidence.LOW,
            verdict_label="Evaluation inconclusive",
            limitations=limitations,
            score_breakdown=[],
            indicators=[],
        )

    # 2. Build full Indicator objects and map by category
    indicators: list[Indicator] = []
    category_findings: dict[IndicatorCategory, list[tuple[TriggeredFinding, int]]] = {
        cat: [] for cat in IndicatorCategory
    }

    seen_ids: set[str] = set()
    for f in findings:
        if f.indicator_id in seen_ids:
            continue
        seen_ids.add(f.indicator_id)

        defn = CATALOG[f.indicator_id]
        pts = f.points_override if f.points_override is not None else defn.default_points

        category_findings[defn.category].append((f, pts))
        indicators.append(
            Indicator(
                indicator_id=defn.indicator_id,
                category=defn.category,
                evidence_kind=defn.evidence_kind,
                title=defn.title,
                description=defn.description,
                observed_value=f.observed_value,
                severity=defn.severity,
                triggered=True,
            )
        )

    # Sort indicators: severity descending, points descending, id ascending
    severity_order = {"critical": 4, "high": 3, "medium": 2, "low": 1, "info": 0}
    indicators.sort(
        key=lambda ind: (
            -severity_order.get(ind.severity.value, 0),
            -CATALOG[ind.indicator_id].default_points,
            ind.indicator_id,
        )
    )

    # 3. Apply category caps and generate ScoreContribution items
    contributions: list[ScoreContribution] = []
    total_score = 0

    for cat, items in category_findings.items():
        if not items:
            continue

        cap = CATEGORY_CAPS.get(cat, 100)
        accumulated_in_category = 0

        for f, pts in items:
            defn = CATALOG[f.indicator_id]

            # Calculate whether this contribution is capped
            if accumulated_in_category >= cap:
                contribution_points = 0
                capped = True
                reason = (
                    f.custom_reason
                    or f"{defn.title} triggered (+{pts} pts discarded: category cap {cap} reached)."
                )
            elif accumulated_in_category + pts > cap:
                allowed = cap - accumulated_in_category
                contribution_points = allowed
                capped = True
                accumulated_in_category = cap
                reason = (
                    f.custom_reason
                    or f"{defn.title} triggered (+{allowed} pts applied: capped at category maximum {cap})."
                )
            else:
                contribution_points = pts
                capped = False
                accumulated_in_category += pts
                reason = f.custom_reason or f"{defn.title} detected in input (+{pts} pts)."

            contributions.append(
                ScoreContribution(
                    indicator_id=defn.indicator_id,
                    points=contribution_points,
                    reason=reason,
                    evidence_kind=defn.evidence_kind,
                    capped=capped,
                )
            )

        total_score += accumulated_in_category

    # Clamp total score between 0 and 100
    clamped_score = min(max(total_score, 0), 100)

    # 4. Map risk level and verdict label
    if clamped_score >= 75:
        risk_level = RiskLevel.CRITICAL
        verdict_label = "Critical threat indicators identified"
    elif clamped_score >= 50:
        risk_level = RiskLevel.HIGH
        verdict_label = "High risk indicators identified"
    elif clamped_score >= 25:
        risk_level = RiskLevel.MEDIUM
        verdict_label = "Suspicious patterns detected"
    else:
        risk_level = RiskLevel.LOW
        verdict_label = "Low risk indicators found"

    # 5. Determine confidence
    triggered_categories = {CATALOG[f.indicator_id].category.value for f in findings}
    is_high_credential_attack = "credential_lure" in triggered_categories and any(
        c in triggered_categories for c in ("impersonation", "homoglyph")
    )

    if (len(findings) >= 3 and len(triggered_categories) >= 2) or is_high_credential_attack:
        confidence = Confidence.HIGH
    elif len(findings) >= 1:
        confidence = Confidence.MEDIUM
    else:
        confidence = Confidence.LOW

    # 6. Build limitations list
    limitations: list[str] = []
    if risk_level == RiskLevel.LOW:
        limitations.append(MANDATORY_LOW_LIMITATION)

    limitations.extend(BASELINE_LIMITATIONS)

    # Add specific limitation if manipulation attempt was detected
    if any(f.indicator_id == "MSG_ANALYZER_MANIPULATION_ATTEMPT" for f in findings):
        limitations.append(
            "Adversarial prompt injection directives were detected in message text and neutralized."
        )

    return ScoringOutcome(
        risk_score=clamped_score,
        risk_level=risk_level,
        confidence=confidence,
        verdict_label=verdict_label,
        limitations=limitations,
        score_breakdown=contributions,
        indicators=indicators,
    )
