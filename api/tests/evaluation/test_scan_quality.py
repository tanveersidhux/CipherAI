"""Quality evaluation and scoring regression test suite for CIPHER AI scanning engine.

Runs the benchmark evaluation corpus (15 URLs + 15 Messages) and asserts
industry-standard statistical detection thresholds:
- Overall Accuracy >= 90%
- Threat Recall (Sensitivity) >= 95%
- False Positive Rate <= 5%
- F1-Score >= 0.90
"""

import pytest

from app.core.config import Settings
from app.evaluation.evaluator import calculate_metrics, run_benchmark_evaluation


def test_calculate_metrics_math():
    """Verify statistical formulas for precision, recall, accuracy, and F1."""
    # Perfect performance: 20 TP, 10 TN, 0 FP, 0 FN
    res = calculate_metrics(tp=20, tn=10, fp=0, fn=0, detailed=[], duration=0.5)
    assert res.total_samples == 30
    assert res.accuracy == 1.0
    assert res.precision == 1.0
    assert res.recall == 1.0
    assert res.specificity == 1.0
    assert res.f1_score == 1.0
    assert res.false_positive_rate == 0.0
    assert res.false_negative_rate == 0.0

    # Imperfect scenario: 18 TP, 8 TN, 2 FP, 2 FN
    res2 = calculate_metrics(tp=18, tn=8, fp=2, fn=2, detailed=[], duration=1.2)
    assert res2.total_samples == 30
    assert res2.accuracy == round(26 / 30, 4)
    assert res2.precision == 0.90
    assert res2.recall == 0.90
    assert res2.f1_score == 0.90
    assert res2.false_positive_rate == 0.20
    assert res2.false_negative_rate == 0.10


def test_benchmark_scan_quality_thresholds():
    """Run full evaluation corpus and enforce critical security and quality bars."""
    settings = Settings(APP_ENV="test", FEATURE_REPUTATION=False)
    report = run_benchmark_evaluation(settings)

    # 1. Total samples evaluated
    assert report.total_samples == 30, f"Expected 30 benchmark samples, got {report.total_samples}"

    # 2. Minimum detection recall: we must not miss real threats (malicious/suspicious)
    assert report.recall >= 0.95, (
        f"Scanner threat recall fell below required 95% bar: {report.recall:.2%}. "
        f"False negatives count: {report.false_negatives}"
    )

    # 3. Maximum false positive rate: we must not flag clean benign sites/messages
    assert report.false_positive_rate <= 0.05, (
        f"Scanner false positive rate exceeded 5% limit: {report.false_positive_rate:.2%}. "
        f"False positives count: {report.false_positives}"
    )

    # 4. Overall balanced F1 score
    assert report.f1_score >= 0.90, (
        f"Scanner F1-score fell below 0.90 benchmark: {report.f1_score:.2%}"
    )

    # 5. Overall accuracy
    assert report.accuracy >= 0.90, (
        f"Overall accuracy fell below 90% benchmark: {report.accuracy:.2%}"
    )


@pytest.mark.parametrize(
    ("url_id", "expected_not_risk"),
    [
        ("url-safe-01", "CRITICAL"),
        ("url-safe-02", "CRITICAL"),
        ("url-safe-03", "CRITICAL"),
        ("url-safe-04", "CRITICAL"),
        ("url-safe-05", "CRITICAL"),
    ],
)
def test_benign_urls_never_critical(url_id: str, expected_not_risk: str):
    """Ensure safe corporate and educational URLs never trigger critical threat alarms."""
    from app.evaluation.dataset import BENCHMARK_URLS
    from app.schemas.scans import UrlScanRequest
    from app.services.scan_service import scan_url

    item = next(u for u in BENCHMARK_URLS if u["id"] == url_id)
    report = scan_url(UrlScanRequest(url=item["input"]), Settings(APP_ENV="test"))
    assert report.assessment.risk_level.value != expected_not_risk
