"""Unit tests for URL parsing, normalization, validation, and defanging."""

import pytest

from app.core.errors import InputTooLargeError, InvalidUrlError
from app.engine.url_validation import build_defanged, parse_and_validate_url


def test_valid_https_url():
    url = "https://example.com/path?arg=1#frag"
    parsed = parse_and_validate_url(url)
    assert parsed.scheme == "https"
    assert parsed.host == "example.com"
    assert parsed.path == "/path"
    assert parsed.query == "arg=1"
    assert parsed.had_explicit_scheme is True
    assert parsed.host_is_ip is False


def test_missing_scheme_defaults_to_http():
    url = "example.com/test"
    parsed = parse_and_validate_url(url)
    assert parsed.scheme == "http"
    assert parsed.had_explicit_scheme is False
    assert parsed.host == "example.com"


def test_uppercase_host_normalized():
    url = "https://WWW.EXAMPLE.COM/Page"
    parsed = parse_and_validate_url(url)
    assert parsed.host == "www.example.com"


def test_ipv4_dotted_decimal():
    url = "http://192.0.2.1:8080/index.html"
    parsed = parse_and_validate_url(url)
    assert parsed.host_is_ip is True
    assert parsed.ip_version == 4
    assert parsed.ip_notation == "dotted"
    assert parsed.port == 8080


def test_ipv4_dword_decimal_normalized():
    url = "http://2130706433/login"
    parsed = parse_and_validate_url(url)
    assert parsed.host_is_ip is True
    assert parsed.ip_notation == "decimal"
    assert parsed.host == "127.0.0.1"


def test_ipv4_hex_notation():
    url = "http://0x7f000001/admin"
    parsed = parse_and_validate_url(url)
    assert parsed.host_is_ip is True
    assert parsed.ip_notation == "hex"
    assert parsed.host == "127.0.0.1"


def test_ipv4_octal_notation():
    url = "http://0177.0.0.1/admin"
    parsed = parse_and_validate_url(url)
    assert parsed.host_is_ip is True
    assert parsed.ip_notation == "octal"
    assert parsed.host == "127.0.0.1"


def test_ipv6_literal():
    url = "http://[2001:db8::1]:80/status"
    parsed = parse_and_validate_url(url)
    assert parsed.host_is_ip is True
    assert parsed.ip_version == 6
    assert parsed.ip_notation == "ipv6"


def test_userinfo_extraction():
    url = "https://user:secret@example.com/auth"
    parsed = parse_and_validate_url(url)
    assert parsed.userinfo_present is True
    assert parsed.userinfo == "user:secret"
    assert parsed.host == "example.com"


def test_deceptive_domain_in_userinfo():
    url = "https://google.com@evil-attacker.com/login"
    parsed = parse_and_validate_url(url)
    assert parsed.userinfo_present is True
    assert parsed.userinfo == "google.com"
    assert parsed.host == "evil-attacker.com"


def test_punycode_and_idn():
    url = "https://xn--pypal-4ve.com/verify"
    parsed = parse_and_validate_url(url)
    assert parsed.is_idn is True
    assert "xn--pypal-4ve" in parsed.punycode_labels


def test_empty_and_whitespace_rejected():
    with pytest.raises(InvalidUrlError) as exc_info:
        parse_and_validate_url("")
    assert exc_info.value.code == "INVALID_URL"

    with pytest.raises(InvalidUrlError) as exc_info:
        parse_and_validate_url("   \t  ")
    assert exc_info.value.code == "INVALID_URL"


def test_input_too_large():
    huge = "https://example.com/" + "a" * 2050
    with pytest.raises(InputTooLargeError) as exc_info:
        parse_and_validate_url(huge, max_chars=2048)
    assert exc_info.value.code == "INPUT_TOO_LARGE"
    assert exc_info.value.http_status == 413


def test_unsupported_schemes_rejected():
    for bad in (
        "javascript:alert(1)",
        "data:text/html,bad",
        "vbscript:bad",
        "file:///etc/passwd",
        "ftp://ftp.example.com",
    ):
        with pytest.raises(InvalidUrlError) as exc_info:
            parse_and_validate_url(bad)
        assert exc_info.value.code == "INVALID_URL"


def test_invalid_port_rejected():
    with pytest.raises(InvalidUrlError):
        parse_and_validate_url("http://example.com:70000/test")


def test_embedded_whitespace_in_host_rejected():
    with pytest.raises(InvalidUrlError):
        parse_and_validate_url("http://example .com/test")


def test_build_defanged_representation():
    url = "https://paypal.com@evil.com:8080/login?user=test#sec"
    parsed = parse_and_validate_url(url)
    defanged = build_defanged(parsed)
    assert defanged == "hxxps://paypal.com@evil[.]com:8080/login?user=test#sec"
    assert "https://" not in defanged
    assert "evil.com" not in defanged
