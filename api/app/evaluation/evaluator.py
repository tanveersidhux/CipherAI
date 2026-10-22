"""Evaluation engine for assessing scan quality, accuracy, and scoring regressions.

Calculates statistical classification metrics:
- Accuracy
- Precision
- Recall (Sensitivity)
- Specificity
- F1 Score
- False Positive Rate (FPR)
- False Negative Rate (FNR)
"""

import time
from dataclasses import dataclass, field
from typing import Any

from app.core.config import Settings
from app.evaluation.dataset import BENCHMARK_MESSAGES, BENCHMARK_URLS
from app.schemas.scans import MessageScanRequest, UrlScanRequest
from app.schemas.threat_report import RiskLevel
from app.services.scan_service import scan_message, scan_url


@dataclass
class EvaluationMetrics:
    total_samples: int = 0
    true_positives: int = 0
    true_negatives: int = 0
    false_positives: int = 0
    false_negatives: int = 0
    accuracy: float = 0.0
    precision: float = 0.0
    recall: float = 0.0
    specificity: float = 0.0
    f1_score: float = 0.0
    false_positive_rate: float = 0.0
    false_negative_rate: float = 0.0
    detailed_results: list[dict[str, Any]] = field(default_factory=list)
    duration_seconds: float = 0.0


def calculate_metrics(
    tp: int, tn: int, fp: int, fn: int, detailed: list[dict[str, Any]], duration: float
) -> EvaluationMetrics:
    """Compute standard statistical classification metrics with safe division."""
    total = tp + tn + fp + fn
    accuracy = (tp + tn) / total if total > 0 else 0.0
    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    specificity = tn / (tn + fp) if (tn + fp) > 0 else 0.0
    f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0
    fpr = fp / (fp + tn) if (fp + tn) > 0 else 0.0
    fnr = fn / (fn + tp) if (fn + tp) > 0 else 0.0

    return EvaluationMetrics(
        total_samples=total,
        true_positives=tp,
        true_negatives=tn,
        false_positives=fp,
        false_negatives=fn,
        accuracy=round(accuracy, 4),
        precision=round(precision, 4),
        recall=round(recall, 4),
        specificity=round(specificity, 4),
        f1_score=round(f1, 4),
        false_positive_rate=round(fpr, 4),
        false_negative_rate=round(fnr, 4),
        detailed_results=detailed,
        duration_seconds=round(duration, 3),
    )


def run_benchmark_evaluation(settings: Settings | None = None) -> EvaluationMetrics:
    """Execute complete benchmark suite and evaluate model detection performance."""
    effective_settings = settings or Settings(APP_ENV="test")
    tp = 0
    tn = 0
    fp = 0
    fn = 0
    detailed: list[dict[str, Any]] = []

    start_time = time.perf_counter()

    # 1. Evaluate Benchmark URLs
    for item in BENCHMARK_URLS:
        req = UrlScanRequest(url=item["input"])
        report = scan_url(req, effective_settings)
        actual_risk = report.assessment.risk_level
        gt = item["ground_truth"]

        is_threat = gt in ("MALICIOUS", "SUSPICIOUS")
        flagged_as_threat = actual_risk in (RiskLevel.MEDIUM, RiskLevel.HIGH, RiskLevel.CRITICAL)

        if is_threat and flagged_as_threat:
            classification = "TP"
            tp += 1
        elif not is_threat and not flagged_as_threat:
            classification = "TN"
            tn += 1
        elif not is_threat and flagged_as_threat:
            classification = "FP"
            fp += 1
        else:
            classification = "FN"
            fn += 1

        detailed.append(
            {
                "id": item["id"],
                "type": "url",
                "input": item["input"],
                "ground_truth": gt,
                "evaluated_risk": actual_risk.value,
                "risk_score": report.assessment.risk_score,
                "classification": classification,
            }
        )

    # 2. Evaluate Benchmark Messages
    for item in BENCHMARK_MESSAGES:
        req = MessageScanRequest(message=item["input"])
        report = scan_message(req, effective_settings)
        actual_risk = report.assessment.risk_level
        gt = item["ground_truth"]

        is_threat = gt in ("MALICIOUS", "SUSPICIOUS")
        flagged_as_threat = actual_risk in (RiskLevel.MEDIUM, RiskLevel.HIGH, RiskLevel.CRITICAL)

        if is_threat and flagged_as_threat:
            classification = "TP"
            tp += 1
        elif not is_threat and not flagged_as_threat:
            classification = "TN"
            tn += 1
        elif not is_threat and flagged_as_threat:
            classification = "FP"
            fp += 1
        else:
            classification = "FN"
            fn += 1

        detailed.append(
            {
                "id": item["id"],
                "type": "message",
                "input": item["input"],
                "ground_truth": gt,
                "evaluated_risk": actual_risk.value,
                "risk_score": report.assessment.risk_score,
                "classification": classification,
            }
        )

    elapsed = time.perf_counter() - start_time
    return calculate_metrics(tp, tn, fp, fn, detailed, elapsed)
