"""Email header extraction and reported authentication auditing."""

import re
from email.message import EmailMessage
from typing import Any


def extract_header_summary(msg: EmailMessage) -> dict[str, Any]:
    """
    Extracts core routing and authentication headers.
    Note: Authentication results are reported values from headers, NOT cryptographically verified by CipherAI.
    """
    from_header = str(msg.get("From", "")).strip()
    reply_to = str(msg.get("Reply-To", "")).strip()
    return_path = str(msg.get("Return-Path", "")).strip()
    subject = str(msg.get("Subject", "")).strip()
    date_str = str(msg.get("Date", "")).strip()
    message_id = str(msg.get("Message-ID", "")).strip()

    # Clean control characters
    from_header = re.sub(r"[\x00-\x1f\x7f]", "", from_header)
    reply_to = re.sub(r"[\x00-\x1f\x7f]", "", reply_to)
    return_path = re.sub(r"[\x00-\x1f\x7f]", "", return_path)
    subject = re.sub(r"[\x00-\x1f\x7f]", "", subject)

    # Received chain hops
    received_headers = msg.get_all("Received", [])
    received_hops = len(received_headers)

    # Reported authentication headers
    auth_results_header = str(msg.get("Authentication-Results", "")).lower()
    received_spf_header = str(msg.get("Received-SPF", "")).lower()
    dkim_header = str(msg.get("DKIM-Signature", "")).strip()

    # Reported SPF assessment
    reported_spf = "unknown"
    if "pass" in received_spf_header or "spf=pass" in auth_results_header:
        reported_spf = "pass"
    elif (
        "fail" in received_spf_header
        or "softfail" in received_spf_header
        or "spf=fail" in auth_results_header
        or "spf=softfail" in auth_results_header
    ):
        reported_spf = "fail"
    elif "neutral" in received_spf_header or "none" in received_spf_header:
        reported_spf = "none"

    # Reported DKIM assessment
    reported_dkim = "unknown"
    if "dkim=pass" in auth_results_header:
        reported_dkim = "pass"
    elif "dkim=fail" in auth_results_header:
        reported_dkim = "fail"
    elif dkim_header:
        reported_dkim = "present_unverified"

    # Reported DMARC assessment
    reported_dmarc = "unknown"
    if "dmarc=pass" in auth_results_header:
        reported_dmarc = "pass"
    elif "dmarc=fail" in auth_results_header:
        reported_dmarc = "fail"

    return {
        "from": from_header,
        "reply_to": reply_to or None,
        "return_path": return_path or None,
        "subject": subject,
        "date": date_str or None,
        "message_id": message_id or None,
        "received_hops": received_hops,
        "reported_authentication": {
            "spf": reported_spf,
            "dkim": reported_dkim,
            "dmarc": reported_dmarc,
            "verified_by_cipher": False,
        },
    }
