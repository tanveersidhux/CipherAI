"""Privacy redaction and safe storage normalization utilities.

Enforces privacy-first defaults by masking emails, phone numbers, and sensitive
long digit sequences from message scans, stripping credentials/fragments from URLs,
and computing deterministic SHA-256 hashes for deduplication.
"""

import hashlib
import re
from urllib.parse import urlparse, urlunparse

# Regex patterns for sensitive entity masking
RE_EMAIL = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b")
RE_PHONE = re.compile(r"(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b")
RE_LONG_DIGITS = re.compile(r"\b\d{8,}\b")


def redact_message_text(text: str, max_chars: int = 500) -> str:
    """Mask obvious emails, phone numbers, and long digit sequences in message text.

    Truncates the redacted output to max_chars.
    """
    if not text:
        return ""

    redacted = RE_EMAIL.sub("[REDACTED_EMAIL]", text)
    redacted = RE_LONG_DIGITS.sub("[REDACTED_NUMBER]", redacted)
    redacted = RE_PHONE.sub("[REDACTED_PHONE]", redacted)

    if len(redacted) > max_chars:
        return redacted[:max_chars].rstrip() + "..."
    return redacted


def normalize_url_for_storage(url: str) -> str:
    """Normalize URL by stripping credentials (user:pass@) and fragments (#...)."""
    if not url:
        return ""

    parsed = urlparse(url.strip())
    # Strip userinfo from netloc
    netloc = parsed.netloc
    if "@" in netloc:
        netloc = netloc.split("@")[-1]

    # Reassemble without credentials and without fragment
    cleaned = urlunparse(
        (
            parsed.scheme or "http",
            netloc,
            parsed.path,
            parsed.params,
            parsed.query,
            "",  # No fragment
        )
    )
    return cleaned


def compute_input_hash(normalized_input: str) -> str:
    """Generate deterministic SHA-256 hex digest of normalized input."""
    return hashlib.sha256((normalized_input or "").encode("utf-8")).hexdigest()
