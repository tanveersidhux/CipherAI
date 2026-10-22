"""Unit tests for Phase 08 email analysis, parser limits, and indicators."""

import pytest

from app.core.config import get_settings
from app.services.email_analysis.headers import extract_header_summary
from app.services.email_analysis.indicators import evaluate_email_indicators
from app.services.email_analysis.parser import BoundedEmailParser
from app.services.email_analysis.service import analyze_email_content

SAMPLE_PHISHING_EMAIL = b"""From: Security Team <security-alert@paypal.security-support-login.com>
To: target-victim@example.com
Subject: URGENT: Your PayPal Account Has Been Suspended!
Date: Wed, 21 Oct 2026 12:00:00 +0000
Message-ID: <12345@evil.com>
Authentication-Results: mx.google.com; dkim=fail; spf=softfail; dmarc=fail
Content-Type: multipart/mixed; boundary="====BOUNDARY===="

--====BOUNDARY====
Content-Type: text/plain; charset="utf-8"

Immediate action required! Your account is locked. Verify your identity now at:
https://paypal.com.verify-login.ru/update-billing

--====BOUNDARY====
Content-Type: application/x-msdownload; name="invoice_details.exe"
Content-Disposition: attachment; filename="invoice_details.exe"

TVqQAAMAAAAEAAAA//8AALgAAAAAAAAAQAAAAAAAAA==
--====BOUNDARY====--
"""


def test_bounded_email_parser_structure():
    """Verify MIME parsing extracts bodies and attachments safely without running macros."""
    msg, plain_body, html_body, attachments = BoundedEmailParser.parse_raw(SAMPLE_PHISHING_EMAIL)
    assert "Your account is locked" in plain_body
    assert len(attachments) == 1
    att = attachments[0]
    assert att["filename"] == "invoice_details.exe"
    assert att["is_executable"] is True
    assert "sha256" in att


def test_extract_header_summary():
    """Verify header extraction captures sender, subject, and authentication flags."""
    msg, _, _, _ = BoundedEmailParser.parse_raw(SAMPLE_PHISHING_EMAIL)
    headers = extract_header_summary(msg)
    assert "security-support-login.com" in headers["from"]
    assert "paypal" in headers["subject"].lower()
    assert headers["reported_authentication"]["dmarc"] == "fail"
    assert headers["reported_authentication"]["spf"] == "fail"


def test_evaluate_email_indicators():
    """Verify email heuristic indicator rules trigger properly on phishing signs."""
    msg, plain_body, html_body, attachments = BoundedEmailParser.parse_raw(SAMPLE_PHISHING_EMAIL)
    headers = extract_header_summary(msg)
    findings, score = evaluate_email_indicators(
        header_summary=headers,
        plain_body=plain_body,
        html_body=html_body,
        attachments=attachments,
    )
    assert score > 30
    indicator_ids = [f.indicator_id for f in findings]
    # Check for authentication failure indicator or attachment indicator
    assert any(
        "ATTACH" in i or "AUTH" in i or "SPOOF" in i or "URGENCY" in i for i in indicator_ids
    )


@pytest.mark.asyncio
async def test_analyze_email_content_full_pipeline():
    """Verify top-level email scan generates a compliant ThreatReport."""
    settings = get_settings()
    report = await analyze_email_content(
        raw_bytes=SAMPLE_PHISHING_EMAIL,
        settings=settings,
        include_reputation=True,
    )
    assert report.scan_type.value == "email"
    assert report.assessment.risk_score >= 50
    assert report.email_summary is not None
    assert report.attachments is not None
    assert len(report.attachments) == 1
