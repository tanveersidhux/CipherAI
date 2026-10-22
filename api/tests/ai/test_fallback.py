"""Unit tests verifying deterministic fallback explanation generation across report categories."""

import json

from app.ai.fallback import build_phase05_fallback_explanation
from app.ai.validator import validate_all
from app.schemas.threat_report import (
    EvidenceKind,
    Indicator,
    IndicatorCategory,
    RiskLevel,
    ScanType,
    Severity,
)
from tests.ai.fakes import make_test_report


def test_fallback_critical_phishing_url():
    report = make_test_report(
        scan_type=ScanType.URL,
        risk_level=RiskLevel.CRITICAL,
        risk_score=90,
    )
    explanation = build_phase05_fallback_explanation(report)

    assert "critical" in explanation.summary.lower()
    assert len(explanation.key_findings) == 2
    assert explanation.confidence.value == "high"
    assert any("not click" in a.action.lower() for a in explanation.recommended_actions)

    # Must pass validator cleanly
    validate_all(json.dumps(explanation.model_dump()), report)


def test_fallback_high_urgency_scam_message():
    indicators = [
        Indicator(
            indicator_id="MSG_URGENCY_DEADLINE",
            category=IndicatorCategory.URGENCY,
            evidence_kind=EvidenceKind.OBSERVED,
            title="Artificial Urgency or Deadline",
            description="Demands action within 24 hours.",
            observed_value="within 24 hours",
            severity=Severity.HIGH,
            triggered=True,
        ),
        Indicator(
            indicator_id="MSG_BANK_IMPERSONATION",
            category=IndicatorCategory.IMPERSONATION,
            evidence_kind=EvidenceKind.OBSERVED,
            title="Financial Institution Impersonation",
            description="Claims to represent Wells Fargo.",
            observed_value="Wells Fargo",
            severity=Severity.HIGH,
            triggered=True,
        ),
    ]
    report = make_test_report(
        scan_type=ScanType.MESSAGE,
        risk_level=RiskLevel.HIGH,
        risk_score=75,
        indicators=indicators,
        display_value="URGENT: Your account suspended. Click to verify.",
    )
    explanation = build_phase05_fallback_explanation(report)

    assert "high-risk" in explanation.summary.lower()
    assert any(
        "financial institution" in a.action.lower() or "credentials" in a.action.lower()
        for a in explanation.recommended_actions
    )

    # Must pass validator cleanly
    validate_all(json.dumps(explanation.model_dump()), report)


def test_fallback_medium_suspicious_domain():
    indicators = [
        Indicator(
            indicator_id="URL_SUSPICIOUS_TLD",
            category=IndicatorCategory.DOMAIN,
            evidence_kind=EvidenceKind.OBSERVED,
            title="Suspicious TLD",
            description="Uses .top TLD.",
            observed_value=".top",
            severity=Severity.MEDIUM,
            triggered=True,
        ),
        Indicator(
            indicator_id="URL_EXCESSIVE_SUBDOMAINS",
            category=IndicatorCategory.URL_STRUCTURE,
            evidence_kind=EvidenceKind.OBSERVED,
            title="Excessive Subdomains",
            description="Multiple subdomains observed.",
            observed_value="a.b.c.example.top",
            severity=Severity.LOW,
            triggered=True,
        ),
    ]
    report = make_test_report(
        scan_type=ScanType.URL,
        risk_level=RiskLevel.MEDIUM,
        risk_score=45,
        indicators=indicators,
    )
    explanation = build_phase05_fallback_explanation(report)

    assert "moderate risk score" in explanation.summary.lower()
    assert explanation.confidence.value == "medium"

    # Must pass validator cleanly
    validate_all(json.dumps(explanation.model_dump()), report)


def test_fallback_inconclusive_report_never_claims_safe():
    report = make_test_report(
        scan_type=ScanType.MESSAGE,
        risk_level=RiskLevel.INCONCLUSIVE,
        risk_score=0,
        indicators=[],
        display_value="Hi",
    )
    explanation = build_phase05_fallback_explanation(report)

    assert "inconclusive" in explanation.summary.lower()
    assert "inconclusive" in explanation.risk_statement.lower()
    assert explanation.confidence.value == "low"
    assert len(explanation.key_findings) == 0

    # Ensure prohibited words are not present
    full_text = explanation.summary + " " + explanation.risk_statement
    assert "safe" not in full_text.lower()
    assert "clean" not in full_text.lower()
    assert "harmless" not in full_text.lower()

    # Must pass validator cleanly
    validate_all(json.dumps(explanation.model_dump()), report)


def test_fallback_low_risk_report():
    indicators = [
        Indicator(
            indicator_id="URL_HTTPS_VALID",
            category=IndicatorCategory.URL_STRUCTURE,
            evidence_kind=EvidenceKind.OBSERVED,
            title="HTTPS Scheme Observed",
            description="Uses HTTPS scheme.",
            observed_value="https",
            severity=Severity.INFO,
            triggered=True,
        )
    ]
    report = make_test_report(
        scan_type=ScanType.URL,
        risk_level=RiskLevel.LOW,
        risk_score=5,
        indicators=indicators,
    )
    explanation = build_phase05_fallback_explanation(report)

    assert "low" in explanation.risk_statement.lower()
    assert explanation.confidence.value == "low"

    # Must pass validator cleanly
    validate_all(json.dumps(explanation.model_dump()), report)
