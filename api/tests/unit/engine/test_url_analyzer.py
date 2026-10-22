"""Unit tests for URL indicators and false positive resistance."""

from app.engine.url_analyzer import analyze_url
from app.engine.url_validation import parse_and_validate_url


def test_url_ip_host():
    parsed = parse_and_validate_url("http://192.0.2.14/index.html")
    findings = analyze_url(parsed)
    ids = [f.indicator_id for f in findings]
    assert "URL_IP_HOST" in ids
    assert "URL_NO_HTTPS" in ids


def test_url_homoglyph_punycode():
    parsed = parse_and_validate_url("https://xn--pypal-4ve.com/account")
    findings = analyze_url(parsed)
    ids = [f.indicator_id for f in findings]
    assert "URL_HOMOGLYPH_PUNYCODE" in ids


def test_url_excessive_subdomains():
    parsed = parse_and_validate_url("https://a.b.c.d.example.com/test")
    findings = analyze_url(parsed)
    ids = [f.indicator_id for f in findings]
    assert "URL_EXCESSIVE_SUBDOMAINS" in ids


def test_url_very_long():
    long_path = "a" * 130
    parsed = parse_and_validate_url(f"https://example.com/{long_path}")
    findings = analyze_url(parsed)
    ids = [f.indicator_id for f in findings]
    assert "URL_VERY_LONG" in ids


def test_url_userinfo_present():
    parsed = parse_and_validate_url("https://admin:pass@example.com/")
    findings = analyze_url(parsed)
    ids = [f.indicator_id for f in findings]
    assert "URL_USERINFO_PRESENT" in ids


def test_url_non_standard_port():
    parsed = parse_and_validate_url("https://example.com:8888/test")
    findings = analyze_url(parsed)
    ids = [f.indicator_id for f in findings]
    assert "URL_NON_STANDARD_PORT" in ids


def test_url_shortener_domain():
    parsed = parse_and_validate_url("https://bit.ly/3x8Qz99")
    findings = analyze_url(parsed)
    ids = [f.indicator_id for f in findings]
    assert "URL_SHORTENER_DOMAIN" in ids


def test_url_suspicious_tld():
    parsed = parse_and_validate_url("https://online-portal.top/test")
    findings = analyze_url(parsed)
    ids = [f.indicator_id for f in findings]
    assert "URL_SUSPICIOUS_TLD" in ids


def test_url_brand_in_subdomain_phishing():
    parsed = parse_and_validate_url("https://paypal.secure-login-portal.com/login")
    findings = analyze_url(parsed)
    ids = [f.indicator_id for f in findings]
    assert "URL_BRAND_IN_SUBDOMAIN" in ids


def test_url_brand_in_subdomain_legitimate_not_triggered():
    # Official brand domain should NOT trigger URL_BRAND_IN_SUBDOMAIN
    parsed = parse_and_validate_url("https://secure.paypal.com/signin")
    findings = analyze_url(parsed)
    ids = [f.indicator_id for f in findings]
    assert "URL_BRAND_IN_SUBDOMAIN" not in ids


def test_url_credential_path_keyword():
    parsed = parse_and_validate_url("https://example.com/account/login.php")
    findings = analyze_url(parsed)
    ids = [f.indicator_id for f in findings]
    assert "URL_CREDENTIAL_PATH_KEYWORD" in ids


def test_url_hex_encoded_chars():
    parsed = parse_and_validate_url("https://example.com/%2e%2e/%2flogin")
    findings = analyze_url(parsed)
    ids = [f.indicator_id for f in findings]
    assert "URL_HEX_ENCODED_CHARS" in ids


def test_url_double_extension():
    parsed = parse_and_validate_url("https://example.com/files/invoice.pdf.exe")
    findings = analyze_url(parsed)
    ids = [f.indicator_id for f in findings]
    assert "URL_DOUBLE_EXTENSION_PATH" in ids


def test_url_lookalike_char_subst():
    parsed = parse_and_validate_url("https://paypa1.com/verify")
    findings = analyze_url(parsed)
    ids = [f.indicator_id for f in findings]
    assert "URL_LOOKALIKE_CHAR_SUBST" in ids


def test_url_multiple_at_symbols():
    parsed = parse_and_validate_url("https://test@google.com@evil.com/")
    findings = analyze_url(parsed)
    ids = [f.indicator_id for f in findings]
    assert "URL_MULTIPLE_AT_SYMBOLS" in ids


def test_url_zero_width_chars():
    parsed = parse_and_validate_url("https://pay\u200bpal.com/login")
    findings = analyze_url(parsed)
    ids = [f.indicator_id for f in findings]
    assert "URL_ZERO_WIDTH_CHARS" in ids


def test_url_suspicious_file_ext():
    parsed = parse_and_validate_url("https://example.com/payload.exe")
    findings = analyze_url(parsed)
    ids = [f.indicator_id for f in findings]
    assert "URL_SUSPICIOUS_FILE_EXT" in ids


def test_url_target_in_query_param():
    parsed = parse_and_validate_url("https://example.com/auth?redirect=http://phish.top")
    findings = analyze_url(parsed)
    ids = [f.indicator_id for f in findings]
    assert "URL_TARGET_IN_QUERY_PARAM" in ids


def test_url_hyphens_in_domain():
    parsed = parse_and_validate_url("https://secure-login-account-verify.com/")
    findings = analyze_url(parsed)
    ids = [f.indicator_id for f in findings]
    assert "URL_HYPHENS_IN_DOMAIN" in ids


def test_url_dynamic_dns_host():
    parsed = parse_and_validate_url("https://mytest.duckdns.org/login")
    findings = analyze_url(parsed)
    ids = [f.indicator_id for f in findings]
    assert "URL_DYNAMIC_DNS_HOST" in ids


def test_url_embedded_ip_in_hex():
    parsed = parse_and_validate_url("http://2130706433/login")
    findings = analyze_url(parsed)
    ids = [f.indicator_id for f in findings]
    assert "URL_EMBEDDED_IP_IN_HEX" in ids


def test_url_brand_in_path_unrelated():
    parsed = parse_and_validate_url("https://randomsite.com/wells-fargo/secure")
    findings = analyze_url(parsed)
    ids = [f.indicator_id for f in findings]
    assert "URL_BRAND_IN_PATH_UNRELATED" in ids


def test_url_suspicious_query_keyword():
    parsed = parse_and_validate_url("https://example.com/auth?session_key=secret123")
    findings = analyze_url(parsed)
    ids = [f.indicator_id for f in findings]
    assert "URL_SUSPICIOUS_QUERY_KEYWORD" in ids


def test_url_numeric_only_subdomain():
    parsed = parse_and_validate_url("https://12345.example.com/test")
    findings = analyze_url(parsed)
    ids = [f.indicator_id for f in findings]
    assert "URL_NUMERIC_ONLY_SUBDOMAIN" in ids


def test_url_whitespace_obfuscation():
    parsed = parse_and_validate_url("https://example.com/test\tpath")
    findings = analyze_url(parsed)
    ids = [f.indicator_id for f in findings]
    assert "URL_WHITESPACE_OBFUSCATION" in ids
