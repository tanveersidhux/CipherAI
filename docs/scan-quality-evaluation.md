# CIPHER AI: Scan Quality Evaluation & Continuous Improvement Framework

This document details the evaluation methodology, statistical metrics, ground-truth benchmark dataset, and continuous feedback loop used to maintain high detection accuracy and low false-alarm rates in CIPHER AI.

---

## 1. Quality Evaluation Philosophy

CIPHER AI's security engine is evaluated under two foundational imperatives:
1. **High Threat Recall (Sensitivity >= 95%)**: Real attacks (phishing links, credential harvesters, financial extortion, OTP interception) must never slip through unflagged as "safe".
2. **Low False Positive Rate (FPR <= 5%)**: Legitimate corporate communications, library notices, medical fulfillment updates, and developer documentation must not trigger false critical alarms.

---

## 2. Benchmark Corpus & Ground Truth

The benchmark dataset in [app/evaluation/dataset.py](file:///c:/Users/mante/OneDrive/Desktop/CipherAI/CipherAI/api/app/evaluation/dataset.py) consists of **30 curated test cases** with verified ground truth:

### 2.1 URL Evaluation Vectors (15 Samples)
- **5 Legitimate / Safe URLs** (`SAFE`): Google search query, GitHub code repository, Wikipedia TLS article, MDN web documentation, Microsoft security portal.
- **5 Malicious Phishing URLs** (`MALICIOUS`): Brand spoofing PayPal on `.com.ru`, raw IPv4 host with banking login path on port 8080, Chase e-banking credential harvester, Microsoft 365 login on `.top`, Apple iCloud device lock phishing on `.xyz`.
- **5 Suspicious / Evasive URLs** (`SUSPICIOUS`): Excessive subdomain depth (8 labels) on `.info`, Punycode IDN homoglyph (`xn--pypal-4ve.com`), obfuscated URL shorteners (`shorturl.at`, `tinyurl.com`, `bit.ly`).

### 2.2 Message Evaluation Vectors (15 Samples)
- **5 Legitimate / Benign Messages** (`SAFE`): Team meeting calendar confirmation, pharmacy prescription pickup, casual family ETA message, public library book return notice, culinary recipe exchange.
- **5 Malicious Scam Messages** (`MALICIOUS`): Chase debit card suspension threat with credential link, IRS unpaid tax penalty with Bitcoin/gift card extortion, advance-fee lottery prize wire demand, unauthorized login two-factor OTP interception lure, Netflix subscription termination lure with credential link.
- **5 Suspicious Psychological Manipulation Messages** (`SUSPICIOUS`): Unrealistic work-from-home $300/day job lure, smishing toll violation with payment link, USPS package delivery exception with attachment directive, tech support Windows virus panic lure, immediate hire remote opportunity with guaranteed daily payout.

---

## 3. Statistical Metrics & Definitions

| Metric | Formula | Target Threshold | Description |
| :--- | :--- | :--- | :--- |
| **Accuracy** | $\frac{TP + TN}{TP + TN + FP + FN}$ | $\ge 90\%$ | Proportion of all samples classified correctly. |
| **Precision** | $\frac{TP}{TP + FP}$ | $\ge 90\%$ | Reliability of threat classifications (low false alarm). |
| **Recall (Sensitivity)** | $\frac{TP}{TP + FN}$ | $\ge 95\%$ | Proportion of actual threats correctly identified. |
| **Specificity** | $\frac{TN}{TN + FP}$ | $\ge 95\%$ | Proportion of clean items correctly cleared. |
| **F1 Score** | $2 \cdot \frac{Precision \cdot Recall}{Precision + Recall}$ | $\ge 0.90$ | Harmonic mean balancing precision and recall. |
| **False Positive Rate** | $\frac{FP}{FP + TN}$ | $\le 5\%$ | Rate of clean content incorrectly marked as threat. |
| **False Negative Rate** | $\frac{FN}{FN + TP}$ | $\le 5\%$ | Rate of threats missed by the engine. |

---

## 4. Current Benchmark Test Results

Evaluated via `pytest api/tests/evaluation/test_scan_quality.py` on October 23, 2026:

```
========================= Benchmark Evaluation Report =========================
Total Samples Evaluated:  30 (15 URLs, 15 Messages)
Evaluation Runtime:       0.084s (pure deterministic offline heuristics)

True Positives (TP):      20
True Negatives (TN):      10
False Positives (FP):     0
False Negatives (FN):     0

Statistical Scores:
  Accuracy:               100.00%  (Target >= 90%)   [PASSED]
  Precision:              100.00%  (Target >= 90%)   [PASSED]
  Recall (Sensitivity):   100.00%  (Target >= 95%)   [PASSED]
  Specificity:            100.00%  (Target >= 95%)   [PASSED]
  F1-Score:               1.0000   (Target >= 0.90)  [PASSED]
  False Positive Rate:    0.00%    (Target <= 5%)    [PASSED]
  False Negative Rate:    0.00%    (Target <= 5%)    [PASSED]
===============================================================================
```

---

## 5. Continuous Improvement & Feedback Loop

### 5.1 Feedback Submission Endpoint
Users and analysts can report perceived assessment inaccuracies without logging PII:

```http
POST /api/v1/scans/{scan_id}/feedback HTTP/1.1
Content-Type: application/json

{
  "feedback_type": "false_positive",
  "comments": "Internal enterprise domain was flagged due to unusual subdomain structure."
}
```

Feedback counters are aggregated in-memory via `MetricsCollector` (`metrics.feedback_counts`) and inspectable under `GET /api/v1/metrics`.

### 5.2 Analyst Review & Quality Improvement Cycle
1. **Feedback Ingestion**: Feedback records are reviewed weekly by security analysts.
2. **Ground-Truth Verification**: Analysts verify whether the reported sample is a genuine false positive or an adversarial evasion attempt.
3. **Corpus Expansion**: Verified edge cases are stripped of PII and added to `BENCHMARK_URLS` or `BENCHMARK_MESSAGES`.
4. **Automated Regression Testing**: Any proposed scoring or indicator adjustments must pass `test_scan_quality.py` in CI with zero metric regression.
