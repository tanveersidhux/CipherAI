"""Unit tests for fallback explanation builder."""

from app.ai.fallback import build_deterministic_explanation
from app.schemas.threat_report import ExplanationGeneratedBy


def test_fallback_explanation_structure():
    assessment = {"risk_level": "critical", "risk_score": 85}
    indicators = [
        {"indicator_id": "URL_IP_HOST", "title": "IP Host", "severity": "high"},
        {
            "indicator_id": "URL_CREDENTIAL_PATH_KEYWORD",
            "title": "Credential Keyword",
            "severity": "high",
        },
    ]

    exp = build_deterministic_explanation(assessment, indicators)
    assert exp.generated_by == ExplanationGeneratedBy.DETERMINISTIC_FALLBACK
    assert exp.model is None
    assert exp.validated is True
    assert len(exp.summary) <= 600

    # Ensure key findings cite only existing indicator IDs
    for kf in exp.key_findings:
        for ind_id in kf.indicator_ids:
            assert ind_id in ["URL_IP_HOST", "URL_CREDENTIAL_PATH_KEYWORD"]


def test_fallback_explanation_empty_indicators():
    assessment = {"risk_level": "inconclusive", "risk_score": 0}
    exp = build_deterministic_explanation(assessment, indicators=[])
    assert len(exp.key_findings) == 0
    assert "inconclusive" in exp.summary.lower()
