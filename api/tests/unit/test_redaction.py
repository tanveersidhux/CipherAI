"""Unit tests for privacy redaction, URL credential stripping, and input hashing."""

from app.services.redaction import (
    compute_input_hash,
    normalize_url_for_storage,
    redact_message_text,
)


def test_redact_emails() -> None:
    text = "Send your credentials to admin-support@phish-domain.org immediately."
    redacted = redact_message_text(text)
    assert "admin-support@phish-domain.org" not in redacted
    assert "[REDACTED_EMAIL]" in redacted


def test_redact_phone_numbers() -> None:
    text = "Call +1 (555) 019-2831 or 555-019-2831 to unlock your account."
    redacted = redact_message_text(text)
    assert "555" not in redacted
    assert "[REDACTED_PHONE]" in redacted


def test_redact_long_digit_sequences() -> None:
    text = "Your card 4111222233334444 has been locked. Account # 9876543210."
    redacted = redact_message_text(text)
    assert "4111222233334444" not in redacted
    assert "9876543210" not in redacted
    assert "[REDACTED_NUMBER]" in redacted


def test_redaction_truncates_at_max_chars() -> None:
    long_text = "Safe content segment. " * 50
    redacted = redact_message_text(long_text, max_chars=100)
    assert len(redacted) <= 103  # 100 + "..."
    assert redacted.endswith("...")


def test_normalize_url_strips_credentials_and_fragments() -> None:
    url = "https://admin:secretPass123@phishing-target.com:8443/login?redirect=true#section2"
    cleaned = normalize_url_for_storage(url)
    assert "secretPass123" not in cleaned
    assert "admin:" not in cleaned
    assert "#section2" not in cleaned
    assert cleaned == "https://phishing-target.com:8443/login?redirect=true"


def test_compute_input_hash_is_deterministic() -> None:
    h1 = compute_input_hash("https://example.com/login")
    h2 = compute_input_hash("https://example.com/login")
    h3 = compute_input_hash("https://different.com/login")
    assert h1 == h2
    assert len(h1) == 64
    assert h1 != h3
