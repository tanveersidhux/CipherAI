"""Unit tests for scoring formula, category caps, thresholds, and inconclusive logic."""

from app.engine.indicators import TriggeredFinding
from app.engine.scoring import score_findings
from app.engine.scoring_config import MANDATORY_LOW_LIMITATION
from app.schemas.threat_report import Confidence, RiskLevel, ScanType


def test_clamping_and_thresholds():
    # Test low threshold (0-24)
    low_findings = [TriggeredFinding(indicator_id="URL_NO_HTTPS", observed_value="http://")]
    res_low = score_findings(low_findings, ScanType.URL, input_length=30)
    assert res_low.risk_score == 10
    assert res_low.risk_level == RiskLevel.LOW
    assert MANDATORY_LOW_LIMITATION in res_low.limitations

    # Test medium threshold (25-49)
    med_findings = [
        TriggeredFinding(indicator_id="URL_SHORTENER_DOMAIN", observed_value="bit.ly"),
        TriggeredFinding(indicator_id="URL_NO_HTTPS", observed_value="http://"),
    ]
    res_med = score_findings(med_findings, ScanType.URL, input_length=30)
    assert res_med.risk_score == 30
    assert res_med.risk_level == RiskLevel.MEDIUM

    # Test high threshold (50-74)
    high_findings = [
        TriggeredFinding(indicator_id="URL_IP_HOST", observed_value="192.0.2.1"),
        TriggeredFinding(indicator_id="URL_NON_STANDARD_PORT", observed_value="8080"),
    ]
    res_high = score_findings(high_findings, ScanType.URL, input_length=30)
    assert res_high.risk_score == 50
    assert res_high.risk_level == RiskLevel.HIGH

    # Test critical threshold (75-100)
    crit_findings = [
        TriggeredFinding(indicator_id="URL_HOMOGLYPH_PUNYCODE", observed_value="xn--"),
        TriggeredFinding(indicator_id="URL_IP_HOST", observed_value="192.0.2.1"),
    ]
    res_crit = score_findings(crit_findings, ScanType.URL, input_length=30)
    assert res_crit.risk_score == 75
    assert res_crit.risk_level == RiskLevel.CRITICAL


def test_category_cap_enforcement():
    # Urgency category has cap of 30.
    # MSG_URGENCY_DEADLINE (+20) + MSG_ACCOUNT_CLOSURE_THREAT (+25) = 45 -> Capped at 30!
    findings = [
        TriggeredFinding(indicator_id="MSG_URGENCY_DEADLINE", observed_value="urgent"),
        TriggeredFinding(indicator_id="MSG_ACCOUNT_CLOSURE_THREAT", observed_value="closure"),
    ]
    res = score_findings(findings, ScanType.MESSAGE, input_length=100)
    assert res.risk_score == 30

    # Verify score breakdown shows capped flag
    capped_contribs = [c for c in res.score_breakdown if c.capped]
    assert len(capped_contribs) == 1
    assert capped_contribs[0].points == 10  # 20 + 10 = 30 cap
    assert capped_contribs[0].capped is True


def test_inconclusive_conditions():
    # Short message < 5 chars with no findings
    res = score_findings([], ScanType.MESSAGE, input_length=3)
    assert res.risk_level == RiskLevel.INCONCLUSIVE
    assert res.risk_score == 0
    assert res.confidence == Confidence.LOW
    assert res.verdict_label == "Evaluation inconclusive"
    assert "insufficient" in res.limitations[0].lower()


def test_never_claims_safe():
    # Clean input
    res = score_findings([], ScanType.URL, input_length=50)
    assert res.risk_level == RiskLevel.LOW
    assert "safe" not in res.verdict_label.lower()
    assert MANDATORY_LOW_LIMITATION in res.limitations
