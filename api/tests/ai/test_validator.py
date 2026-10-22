"""Unit tests for the five-stage validation pipeline."""

import json

import pytest

from app.ai.validator import (
    GroundingValidationError,
    InvalidJSONError,
    SafetyLanguageError,
    SchemaValidationError,
    extract_json_object,
    validate_all,
)
from app.schemas.threat_report import RiskLevel
from tests.ai.fakes import make_test_report

VALID_EXPLANATION_DICT = {
    "summary": "This is a plain-language summary of the critical risk URL observed on raw IP host.",
    "risk_statement": "Severe risk of credential harvesting and identity theft detected.",
    "key_findings": [
        {
            "title": "IP Host Detected",
            "detail": "Destination specifies a raw numerical IP address.",
            "evidence_ids": ["URL_IP_HOST"],
        }
    ],
    "recommended_actions": [
        {
            "priority": "high",
            "action": "Do not enter passwords or sensitive personal data on this link.",
        }
    ],
    "confidence": "high",
    "limitations": ["Offline lexical evaluation only."],
    "disclaimer": "Advisory security evaluation.",
}


def test_extract_json_from_clean_string():
    raw = json.dumps(VALID_EXPLANATION_DICT)
    extracted = extract_json_object(raw)
    assert extracted == raw


def test_extract_json_from_markdown_fences():
    raw = f"```json\n{json.dumps(VALID_EXPLANATION_DICT)}\n```"
    extracted = extract_json_object(raw)
    assert json.loads(extracted)["summary"] == VALID_EXPLANATION_DICT["summary"]


def test_extract_json_with_surrounding_text():
    raw = f"Here is the threat report:\n{json.dumps(VALID_EXPLANATION_DICT)}\nThank you."
    extracted = extract_json_object(raw)
    assert json.loads(extracted)["summary"] == VALID_EXPLANATION_DICT["summary"]


def test_extract_json_fails_when_no_json():
    with pytest.raises(InvalidJSONError):
        extract_json_object("Just a plain text response without any brackets.")


def test_validate_all_passes_valid_payload():
    report = make_test_report()
    raw = json.dumps(VALID_EXPLANATION_DICT)
    result = validate_all(raw, report)
    assert result.summary == VALID_EXPLANATION_DICT["summary"]
    assert result.confidence.value == "high"


def test_reject_extra_fields():
    report = make_test_report()
    bad_dict = dict(VALID_EXPLANATION_DICT)
    bad_dict["unexpected_secret_field"] = "malicious_injection"
    with pytest.raises(SchemaValidationError):
        validate_all(json.dumps(bad_dict), report)


def test_reject_missing_required_field():
    report = make_test_report()
    bad_dict = dict(VALID_EXPLANATION_DICT)
    del bad_dict["summary"]
    with pytest.raises(SchemaValidationError):
        validate_all(json.dumps(bad_dict), report)


def test_reject_unknown_evidence_id_citation():
    report = make_test_report()  # Contains URL_IP_HOST, URL_CREDENTIAL_PATH_KEYWORD
    bad_dict = dict(VALID_EXPLANATION_DICT)
    bad_dict["key_findings"] = [
        {
            "title": "Fabricated Finding",
            "detail": "Model made up an indicator ID.",
            "evidence_ids": ["URL_FABRICATED_INDICATOR_999"],
        }
    ]
    with pytest.raises(GroundingValidationError):
        validate_all(json.dumps(bad_dict), report)


def test_reject_more_than_eight_findings():
    report = make_test_report()
    bad_dict = dict(VALID_EXPLANATION_DICT)
    bad_dict["key_findings"] = [
        {
            "title": f"Finding {i}",
            "detail": "Detail text.",
            "evidence_ids": ["URL_IP_HOST"],
        }
        for i in range(9)
    ]
    with pytest.raises(SchemaValidationError):
        validate_all(json.dumps(bad_dict), report)


def test_reject_risk_downgrade_on_critical_report():
    report = make_test_report(risk_level=RiskLevel.CRITICAL)
    bad_dict = dict(VALID_EXPLANATION_DICT)
    bad_dict["risk_statement"] = "This is a low risk event with no threat."
    with pytest.raises(GroundingValidationError):
        validate_all(json.dumps(bad_dict), report)


def test_reject_high_confidence_on_inconclusive_report():
    report = make_test_report(risk_level=RiskLevel.INCONCLUSIVE, indicators=[])
    bad_dict = dict(VALID_EXPLANATION_DICT)
    bad_dict["risk_statement"] = "Evaluation is inconclusive."
    bad_dict["key_findings"] = []
    bad_dict["confidence"] = "high"  # High confidence prohibited on inconclusive
    with pytest.raises(GroundingValidationError):
        validate_all(json.dumps(bad_dict), report)


def test_reject_affirmative_safe_claims():
    report = make_test_report()
    unsafe_phrases = [
        "This link is completely safe to click.",
        "There is no risk with this domain.",
        "Nothing to worry about for this sender.",
        "It is a legitimate website.",
        "The asset is harmless.",
    ]
    for phrase in unsafe_phrases:
        bad_dict = dict(VALID_EXPLANATION_DICT)
        bad_dict["summary"] = phrase
        with pytest.raises(SafetyLanguageError):
            validate_all(json.dumps(bad_dict), report)


def test_allow_negated_safe_claims():
    report = make_test_report()
    allowed_dict = dict(VALID_EXPLANATION_DICT)
    allowed_dict["summary"] = (
        "This destination cannot be considered safe due to observed credential lures. It is not safe."
    )
    result = validate_all(json.dumps(allowed_dict), report)
    assert "cannot be considered safe" in result.summary


def test_reject_click_or_visit_directives():
    report = make_test_report()
    bad_dict = dict(VALID_EXPLANATION_DICT)
    bad_dict["recommended_actions"] = [
        {"priority": "high", "action": "Visit the website to check if your account is suspended."}
    ]
    with pytest.raises(SafetyLanguageError):
        validate_all(json.dumps(bad_dict), report)


def test_reject_html_tags_and_code_blocks():
    report = make_test_report()
    html_dict = dict(VALID_EXPLANATION_DICT)
    html_dict["summary"] = "Dangerous link <script>alert(1)</script> detected."
    with pytest.raises(SafetyLanguageError):
        validate_all(json.dumps(html_dict), report)

    code_dict = dict(VALID_EXPLANATION_DICT)
    code_dict["summary"] = "Run this curl command: ```bash curl -I http://evil.com ```"
    with pytest.raises(SafetyLanguageError):
        validate_all(json.dumps(code_dict), report)
