"""Golden tests verifying all 10 Phase 01 worked scoring examples reproduce exactly."""

import json
import os

import pytest

from app.core.config import Settings
from app.schemas.scans import MessageScanRequest, UrlScanRequest
from app.services.scan_service import scan_message, scan_url

FIXTURE_PATH = os.path.join(
    os.path.dirname(__file__), "..", "..", "fixtures", "phase01_worked_examples.json"
)


def load_golden_examples():
    with open(FIXTURE_PATH, encoding="utf-8") as f:
        return json.load(f)


@pytest.mark.parametrize(
    "example",
    load_golden_examples(),
    ids=lambda ex: f"Example-{ex['example_id']}-{ex['scan_type']}",
)
def test_golden_example(example):
    settings = Settings()
    scan_type = example["scan_type"]
    input_text = example["input"]

    if scan_type == "url":
        req = UrlScanRequest(url=input_text)
        report = scan_url(req, settings)
    else:
        req = MessageScanRequest(message=input_text)
        report = scan_message(req, settings)

    # 1. Assert score matches exactly
    assert report.assessment.risk_score == example["expected_score"], (
        f"Example {example['example_id']} score mismatch: expected {example['expected_score']}, got {report.assessment.risk_score}"
    )

    # 2. Assert level matches
    assert report.assessment.risk_level.value == example["expected_level"], (
        f"Example {example['example_id']} level mismatch: expected {example['expected_level']}, got {report.assessment.risk_level.value}"
    )

    # 3. Assert confidence matches
    assert report.assessment.confidence.value == example["expected_confidence"], (
        f"Example {example['example_id']} confidence mismatch: expected {example['expected_confidence']}, got {report.assessment.confidence.value}"
    )

    # 4. Assert triggered indicators match expected set
    actual_indicator_ids = {ind.indicator_id for ind in report.indicators}
    expected_indicator_ids = set(example["expected_indicators"])

    assert expected_indicator_ids.issubset(actual_indicator_ids), (
        f"Example {example['example_id']} missing expected indicators: {expected_indicator_ids - actual_indicator_ids}"
    )
