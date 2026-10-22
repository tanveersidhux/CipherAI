"""Unit tests for bounded text extraction."""

from app.engine.extractors import extract_entities


def test_extract_standard_entities():
    text = (
        "Contact me at support@example.com or call +1 (555) 123-4567. "
        "Visit https://example.com/login or send bitcoin to 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa."
    )
    entities = extract_entities(text)
    assert len(entities.emails) == 1
    assert entities.emails[0] == "support@example.com"
    assert len(entities.phone_numbers) == 1
    assert "123-4567" in entities.phone_numbers[0]
    assert len(entities.urls) == 1
    assert entities.urls[0].host == "example.com"
    assert len(entities.crypto_wallets) == 1
    assert entities.crypto_wallets[0] == "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"


def test_extract_defanged_urls():
    text = "Malicious link detected at hxxps://evil[.]com/phish and test(dot)com/path."
    entities = extract_entities(text)
    hosts = [u.host for u in entities.urls]
    assert "evil.com" in hosts


def test_caps_enforced():
    # Construct message with 15 emails and 15 URLs
    emails_str = " ".join([f"user{i}@example.com" for i in range(15)])
    urls_str = " ".join([f"https://site{i}.example.com" for i in range(15)])
    combined = f"{emails_str} {urls_str}"

    entities = extract_entities(combined)
    assert len(entities.emails) == 5
    assert len(entities.urls) == 10
    assert len(entities.cap_notes) >= 2


def test_malformed_url_does_not_abort_scan():
    text = "Broken link: javascript:void(0) and good link https://example.com/safe."
    entities = extract_entities(text)
    assert len(entities.urls) == 1
    assert entities.urls[0].host == "example.com"
