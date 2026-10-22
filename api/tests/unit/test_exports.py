"""Unit tests for Phase 08 report and case export service with formula-injection mitigation."""

from app.schemas.threat_report import (
    AIStatus,
    Confidence,
    EvidenceKind,
    ExplanationGeneratedBy,
    ExternalLookupStatus,
    IndicatorCategory,
    RiskLevel,
    ScanType,
    Severity,
    ThreatReport,
)
from app.services.export_service import ExportService, neutralize_csv_cell


def test_neutralize_csv_cell_mitigates_formula_injection():
    """Verify cells starting with formula triggers (=, +, -, @, tab, cr) are neutralized."""
    assert neutralize_csv_cell("=1+1") == "'=1+1"
    assert neutralize_csv_cell("+cmd|' /C calc'!A0") == "'+cmd|' /C calc'!A0"
    assert neutralize_csv_cell("-5+2") == "'-5+2"
    assert neutralize_csv_cell("@SUM(A1:A10)") == "'@SUM(A1:A10)"
    assert neutralize_csv_cell("\tmalicious_tab") == "'\tmalicious_tab"
    assert neutralize_csv_cell("\rmalicious_cr") == "'\rmalicious_cr"
    # Normal safe strings
    assert neutralize_csv_cell("Safe String") == "Safe String"
    assert neutralize_csv_cell(12345) == "12345"


def test_export_scan_json_and_csv():
    """Verify threat report exports correctly formatted JSON and CSV representations."""
    service = ExportService()
    report = ThreatReport(
        report_id="rep_test_123",
        scan_type=ScanType.URL,
        created_at="2026-10-21T12:00:00Z",
        input={
            "display_value": "https://example[.]com",
            "normalized_value": "https://example.com",
            "input_hash": "a" * 64,
            "input_length": 19,
        },
        assessment={
            "risk_score": 85,
            "risk_level": RiskLevel.HIGH,
            "confidence": Confidence.HIGH,
            "verdict_label": "High Risk",
            "limitations": [],
        },
        indicators=[
            {
                "indicator_id": "URL_IP_HOST",
                "category": IndicatorCategory.URL_STRUCTURE,
                "evidence_kind": EvidenceKind.OBSERVED,
                "title": "IP Host",
                "description": "Direct IP used",
                "severity": Severity.HIGH,
                "triggered": True,
            }
        ],
        score_breakdown=[],
        external_evidence=[],
        ai_explanation={
            "summary": "This is a suspicious target.",
            "key_findings": [{"text": "IP Host detected", "indicator_ids": ["URL_IP_HOST"]}],
            "user_guidance": "Do not enter credentials.",
            "uncertainty_notes": "None",
            "generated_by": ExplanationGeneratedBy.DETERMINISTIC_FALLBACK,
            "validated": True,
        },
        recommended_actions=[],
        engine_version="1.0.0",
        processing={
            "duration_ms": 12,
            "ai_status": AIStatus.USED,
            "external_lookup_status": ExternalLookupStatus.COMPLETE,
        },
    )

    # Test JSON export
    raw_json, content_type_json = service.export_scan(report, "json")
    assert content_type_json == "application/json"
    assert b"rep_test_123" in raw_json
    assert b"DISCLAIMER" in raw_json

    # Test CSV export
    raw_csv, content_type_csv = service.export_scan(report, "csv")
    assert content_type_csv == "text/csv; charset=utf-8"
    assert b"rep_test_123" in raw_csv
    assert b"85" in raw_csv
    assert b"Scan ID" in raw_csv
    assert b"URL_IP_HOST" in raw_csv
    assert b"DISCLAIMER" in raw_json
