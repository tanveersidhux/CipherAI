"""Email indicator heuristics and security findings."""

import re
from typing import Any
from urllib.parse import urlparse

from app.schemas.threat_report import EvidenceKind, Indicator, IndicatorCategory, Severity


def extract_email_address(header_val: str) -> str:
    """Extract clean email address from a header like 'John Doe <john@example.com>'."""
    match = re.search(r"[\w\.-]+@[\w\.-]+", header_val)
    return match.group(0).lower() if match else ""


def extract_domain(email_addr: str) -> str:
    """Extract domain from an email address."""
    parts = email_addr.split("@")
    return parts[1].lower() if len(parts) > 1 else ""


def evaluate_email_indicators(
    header_summary: dict[str, Any],
    plain_body: str,
    html_body: str,
    attachments: list[dict[str, Any]],
) -> tuple[list[Indicator], int]:
    """Analyze email metadata and content for phishing and spoofing indicators."""
    indicators: list[Indicator] = []
    total_score = 0

    from_raw = header_summary.get("from") or ""
    reply_to_raw = header_summary.get("reply_to") or ""
    header_summary.get("return_path") or ""
    subject = header_summary.get("subject") or ""

    from_addr = extract_email_address(from_raw)
    from_domain = extract_domain(from_addr)

    # 1. From vs Reply-To Domain Mismatch
    if reply_to_raw:
        reply_to_addr = extract_email_address(reply_to_raw)
        reply_to_domain = extract_domain(reply_to_addr)
        if from_domain and reply_to_domain and from_domain != reply_to_domain:
            points = 25
            total_score += points
            indicators.append(
                Indicator(
                    indicator_id="EMAIL_REPLY_TO_MISMATCH",
                    category=IndicatorCategory.IMPERSONATION,
                    evidence_kind=EvidenceKind.OBSERVED,
                    title="Reply-To Domain Mismatch",
                    description=f"Email claims to originate from '{from_domain}', but replies are directed to external domain '{reply_to_domain}'.",
                    observed_value=f"From: {from_domain}, Reply-To: {reply_to_domain}",
                    severity=Severity.HIGH,
                    triggered=True,
                )
            )

    # 2. Display Name Impersonation
    brand_keywords = [
        "paypal",
        "microsoft",
        "google",
        "apple",
        "amazon",
        "netflix",
        "bank",
        "chase",
        "wells fargo",
        "security",
    ]
    from_name = from_raw.split("<")[0].lower() if "<" in from_raw else ""
    for brand in brand_keywords:
        if brand in from_name and brand not in from_domain:
            points = 30
            total_score += points
            indicators.append(
                Indicator(
                    indicator_id="EMAIL_DISPLAY_NAME_SPOOF",
                    category=IndicatorCategory.IMPERSONATION,
                    evidence_kind=EvidenceKind.OBSERVED,
                    title="Display Name Brand Impersonation",
                    description=f"Sender display name mentions trusted brand '{brand}', but actual sender domain is '{from_domain}'.",
                    observed_value=f"Display Name: '{from_name.strip()}', Sender Domain: '{from_domain}'",
                    severity=Severity.HIGH,
                    triggered=True,
                )
            )
            break

    # 3. Reported Authentication Failures
    auth = header_summary.get("reported_authentication") or {}
    if auth.get("spf") == "fail" or auth.get("dmarc") == "fail":
        points = 25
        total_score += points
        indicators.append(
            Indicator(
                indicator_id="EMAIL_AUTH_REPORTED_FAILURE",
                category=IndicatorCategory.DOMAIN,
                evidence_kind=EvidenceKind.OBSERVED,
                title="Reported Email Authentication Failure",
                description=f"Header Authentication-Results reported validation failure: SPF={auth.get('spf')}, DMARC={auth.get('dmarc')}. (Reported value, not cryptographically verified by CipherAI).",
                observed_value=f"SPF={auth.get('spf')}, DMARC={auth.get('dmarc')}",
                severity=Severity.HIGH,
                triggered=True,
            )
        )

    # 4. Urgent Subject Line Keywords
    urgent_words = [
        "urgent",
        "action required",
        "immediate",
        "suspended",
        "account locked",
        "verify now",
        "24 hours",
        "unauthorized",
    ]
    subject_lower = subject.lower()
    for word in urgent_words:
        if word in subject_lower:
            points = 15
            total_score += points
            indicators.append(
                Indicator(
                    indicator_id="EMAIL_URGENCY_SUBJECT",
                    category=IndicatorCategory.URGENCY,
                    evidence_kind=EvidenceKind.OBSERVED,
                    title="Artificial Urgency in Subject",
                    description=f"Subject line employs coercive urgency pattern: '{word}'.",
                    observed_value=f"Urgent token '{word}' in subject '{subject}'",
                    severity=Severity.MEDIUM,
                    triggered=True,
                )
            )
            break

    # 5. Dangerous or Risky Attachments
    has_risky_attachment = any(
        a.get("risky_extension") or a.get("is_executable") for a in attachments
    )
    if has_risky_attachment:
        points = 35
        total_score += points
        risky_names = [
            a.get("filename")
            for a in attachments
            if a.get("risky_extension") or a.get("is_executable")
        ]
        indicators.append(
            Indicator(
                indicator_id="EMAIL_DANGEROUS_ATTACHMENT",
                category=IndicatorCategory.ATTACHMENT,
                evidence_kind=EvidenceKind.OBSERVED,
                title="Suspicious or Executable Attachment",
                description=f"Email contains potentially executable or script attachments: {', '.join(risky_names[:3])}.",
                observed_value=f"Risky attachments: {', '.join(risky_names[:3])}",
                severity=Severity.CRITICAL,
                triggered=True,
            )
        )

    # 6. HTML Mismatched Anchor Href vs Anchor Text
    if html_body:
        anchor_matches = re.findall(
            r'<a[^>]+href=["\'](https?://[^"\']+)["\'][^>]*>(.*?)</a>', html_body, re.IGNORECASE
        )
        for href, text in anchor_matches:
            text_clean = re.sub(r"<[^>]+>", "", text).strip()
            if text_clean.startswith("http://") or text_clean.startswith("https://"):
                try:
                    parsed_href = urlparse(href).netloc.lower()
                    parsed_text = urlparse(text_clean).netloc.lower()
                    if parsed_href and parsed_text and parsed_href != parsed_text:
                        points = 30
                        total_score += points
                        indicators.append(
                            Indicator(
                                indicator_id="EMAIL_DECEPTIVE_LINK_TEXT",
                                category=IndicatorCategory.CREDENTIAL_LURE,
                                evidence_kind=EvidenceKind.OBSERVED,
                                title="Deceptive Link Text Mismatch",
                                description=f"HTML link text displays '{parsed_text}', but the actual link destination points to '{parsed_href}'.",
                                observed_value=f"Displayed anchor text: '{parsed_text}', Actual destination href: '{parsed_href}'",
                                severity=Severity.CRITICAL,
                                triggered=True,
                            )
                        )
                        break
                except Exception:
                    pass

    return indicators, total_score
