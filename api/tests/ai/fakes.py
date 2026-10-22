"""Fake LLM client and mock report fixtures for deterministic unit and integration testing."""

from typing import Any

from app.ai.client import LLMClient
from app.schemas.threat_report import (
    AIExplanation,
    AIStatus,
    Assessment,
    Confidence,
    EvidenceKind,
    ExplanationGeneratedBy,
    ExternalLookupStatus,
    Indicator,
    IndicatorCategory,
    InputInfo,
    KeyFinding,
    Processing,
    RecommendedAction,
    RiskLevel,
    ScanType,
    ScoreContribution,
    Severity,
    ThreatReport,
)


class FakeLLMClient(LLMClient):
    """Scripted in-memory LLM client for deterministic tests without network calls."""

    def __init__(self, responses: list[str | Exception] | None = None) -> None:
        self.responses = list(responses or [])
        self.calls: list[dict[str, Any]] = []

    async def generate_structured(
        self,
        system_prompt: str,
        user_prompt: str,
        json_schema: dict[str, Any] | None = None,
        timeout_seconds: float = 12.0,
    ) -> str:
        self.calls.append(
            {
                "system_prompt": system_prompt,
                "user_prompt": user_prompt,
                "json_schema": json_schema,
                "timeout_seconds": timeout_seconds,
            }
        )

        if not self.responses:
            raise RuntimeError("FakeLLMClient has no remaining scripted responses")

        item = self.responses.pop(0)
        if isinstance(item, Exception):
            raise item
        return item


def make_test_report(
    scan_type: ScanType = ScanType.URL,
    risk_level: RiskLevel = RiskLevel.CRITICAL,
    risk_score: int = 85,
    indicators: list[Indicator] | None = None,
    display_value: str = "hxxp://192.0.2.14:8080/secure/login/verify.php",
    limitations: list[str] | None = None,
) -> ThreatReport:
    """Build a complete, schema-valid ThreatReport for testing."""
    if indicators is None:
        if risk_level == RiskLevel.CRITICAL:
            indicators = [
                Indicator(
                    indicator_id="URL_IP_HOST",
                    category=IndicatorCategory.DOMAIN,
                    evidence_kind=EvidenceKind.OBSERVED,
                    title="IP Address Used as Hostname",
                    description="Direct raw IP address host used to bypass domain reputation.",
                    observed_value="192.0.2.14",
                    severity=Severity.HIGH,
                    triggered=True,
                ),
                Indicator(
                    indicator_id="URL_CREDENTIAL_PATH_KEYWORD",
                    category=IndicatorCategory.CREDENTIAL_LURE,
                    evidence_kind=EvidenceKind.OBSERVED,
                    title="Credential Keywords in Path",
                    description="Path segments contain login credential keywords.",
                    observed_value="verify.php",
                    severity=Severity.HIGH,
                    triggered=True,
                ),
            ]
        elif risk_level == RiskLevel.INCONCLUSIVE:
            indicators = []
        else:
            indicators = [
                Indicator(
                    indicator_id="URL_SUSPICIOUS_TLD",
                    category=IndicatorCategory.DOMAIN,
                    evidence_kind=EvidenceKind.OBSERVED,
                    title="Suspicious Top-Level Domain",
                    description="TLD has disproportionately high spam/phishing association.",
                    observed_value=".top",
                    severity=Severity.MEDIUM,
                    triggered=True,
                )
            ]

    score_breakdown = [
        ScoreContribution(
            indicator_id=ind.indicator_id,
            points=35 if ind.severity == Severity.HIGH else 15,
            reason=ind.description,
            evidence_kind=ind.evidence_kind,
            capped=False,
        )
        for ind in indicators
    ]

    conf = (
        Confidence.LOW
        if (risk_level == RiskLevel.INCONCLUSIVE or len(indicators) < 2)
        else Confidence.HIGH
    )

    return ThreatReport(
        report_id="11111111-1111-4111-8111-111111111101",
        schema_version="1.0",
        scan_type=scan_type,
        created_at="2026-10-22T12:00:00Z",
        input=InputInfo(
            display_value=display_value,
            normalized_value=display_value.replace("hxxp", "http"),
            input_hash="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            input_length=len(display_value),
        ),
        assessment=Assessment(
            risk_score=risk_score,
            risk_level=risk_level,
            confidence=conf,
            verdict_label=f"{risk_level.value.capitalize()} threat indicators detected",
            limitations=limitations or ["Offline lexical analysis only."],
        ),
        indicators=indicators,
        score_breakdown=score_breakdown,
        external_evidence=[],
        ai_explanation=AIExplanation(
            summary="Initial offline assessment summary.",
            key_findings=[
                KeyFinding(
                    text=f"{ind.title} ({ind.severity.value}).",
                    indicator_ids=[ind.indicator_id],
                )
                for ind in indicators
            ],
            user_guidance="Standard security vigilance applies.",
            uncertainty_notes="Offline heuristic scan.",
            generated_by=ExplanationGeneratedBy.DETERMINISTIC_FALLBACK,
            model=None,
            validated=True,
        ),
        recommended_actions=[
            RecommendedAction(
                action_id="ACT_DO_NOT_CLICK",
                priority=1,
                text="Do not click or submit credentials to this address.",
                applies_to_levels=[RiskLevel.HIGH, RiskLevel.CRITICAL],
            )
        ],
        engine_version="1.0.0",
        processing=Processing(
            duration_ms=10,
            ai_status=AIStatus.FALLBACK_USED,
            external_lookup_status=ExternalLookupStatus.NOT_ATTEMPTED,
        ),
    )
