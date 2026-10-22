"""Corpus testing against benign and adversarial datasets."""

import json
import os

from app.core.config import Settings
from app.schemas.scans import MessageScanRequest, UrlScanRequest
from app.services.scan_service import scan_message, scan_url

FIXTURES_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "fixtures")


def load_fixture(filename: str):
    with open(os.path.join(FIXTURES_DIR, filename), encoding="utf-8") as f:
        return json.load(f)


def test_benign_urls_corpus():
    settings = Settings()
    urls = load_fixture("benign_urls.json")
    assert len(urls) >= 30

    false_positives = 0
    for item in urls:
        target_url = item["url"]
        max_allowed = item["max_level"]
        req = UrlScanRequest(url=target_url)
        report = scan_url(req, settings)

        actual_level = report.assessment.risk_level.value
        # If expected is low and actual is high or critical, count as false positive
        if (
            max_allowed == "low"
            and actual_level in ("high", "critical")
            or max_allowed == "medium"
            and actual_level == "critical"
        ):
            false_positives += 1

    fp_rate = false_positives / len(urls)
    assert fp_rate == 0.0, f"False positive rate too high on benign URL corpus: {fp_rate:.2%}"


def test_benign_messages_corpus():
    settings = Settings()
    messages = load_fixture("benign_messages.json")
    assert len(messages) >= 20

    false_positives = 0
    for item in messages:
        text = item["message"]
        req = MessageScanRequest(message=text)
        report = scan_message(req, settings)

        actual_level = report.assessment.risk_level.value
        if actual_level in ("high", "critical"):
            false_positives += 1

    fp_rate = false_positives / len(messages)
    assert fp_rate == 0.0, f"False positive rate too high on benign message corpus: {fp_rate:.2%}"


def test_adversarial_inputs_corpus():
    settings = Settings()
    adversarial = load_fixture("adversarial_inputs.json")
    assert len(adversarial) >= 25

    for case in adversarial:
        inp = case["input"]
        inp_type = case["type"]

        if inp_type == "url":
            req = UrlScanRequest(url=inp)
            report = scan_url(req, settings)
        else:
            req = MessageScanRequest(message=inp)
            report = scan_message(req, settings)

        assert report.report_id is not None
        assert report.assessment.risk_score >= 0
        assert report.assessment.risk_level is not None
