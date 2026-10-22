"""Deterministic URL analyzer implementing all 26 Phase 01 URL indicators."""

import re
import urllib.parse

from app.engine.data_loader import (
    BRAND_DOMAINS,
    CREDENTIAL_KEYWORDS,
    OPEN_REDIRECT_PARAMS,
    SHORTENER_DOMAINS,
    SUSPICIOUS_QUERY_PARAMS,
    SUSPICIOUS_TLDS,
)
from app.engine.indicators import TriggeredFinding, registry
from app.engine.normalization import ZERO_WIDTH_CHARS, sanitize_observed_value
from app.engine.url_validation import ParsedUrl

# Leetspeak translation table for lookalike detection
LEET_TRANS = str.maketrans(
    {
        "0": "o",
        "1": "l",
        "3": "e",
        "4": "a",
        "5": "s",
        "7": "t",
        "8": "b",
        "@": "a",
        "$": "s",
    }
)

# Suspicious executable extensions
SUSPICIOUS_EXTENSIONS = {
    ".exe",
    ".scr",
    ".bat",
    ".cmd",
    ".ps1",
    ".msi",
    ".apk",
    ".vbs",
    ".pif",
    ".cpl",
}

# Dynamic DNS domains
DYNDNS_DOMAINS = {
    "duckdns.org",
    "no-ip.biz",
    "no-ip.org",
    "no-ip.com",
    "ngrok.io",
    "ngrok-free.app",
    "hopto.org",
    "zapto.org",
    "ddns.net",
}


@registry.register_url_rule("URL_IP_HOST")
def check_ip_host(parsed: ParsedUrl) -> TriggeredFinding | None:
    if parsed.host_is_ip:
        return TriggeredFinding(
            indicator_id="URL_IP_HOST",
            observed_value=sanitize_observed_value(parsed.host),
        )
    return None


@registry.register_url_rule("URL_HOMOGLYPH_PUNYCODE")
def check_homoglyph_punycode(parsed: ParsedUrl) -> TriggeredFinding | None:
    if parsed.is_idn or "xn--" in parsed.host:
        obs = parsed.unicode_host if parsed.unicode_host != parsed.host else parsed.host
        return TriggeredFinding(
            indicator_id="URL_HOMOGLYPH_PUNYCODE",
            observed_value=sanitize_observed_value(obs),
        )
    return None


@registry.register_url_rule("URL_EXCESSIVE_SUBDOMAINS")
def check_excessive_subdomains(parsed: ParsedUrl) -> TriggeredFinding | None:
    if len(parsed.subdomain_labels) >= 4:
        return TriggeredFinding(
            indicator_id="URL_EXCESSIVE_SUBDOMAINS",
            observed_value=sanitize_observed_value(".".join(parsed.subdomain_labels)),
        )
    return None


@registry.register_url_rule("URL_VERY_LONG")
def check_very_long(parsed: ParsedUrl) -> TriggeredFinding | None:
    if len(parsed.original) > 120:
        return TriggeredFinding(
            indicator_id="URL_VERY_LONG",
            observed_value=sanitize_observed_value(f"Length {len(parsed.original)} chars"),
        )
    return None


@registry.register_url_rule("URL_USERINFO_PRESENT")
def check_userinfo(parsed: ParsedUrl) -> TriggeredFinding | None:
    if parsed.userinfo_present:
        return TriggeredFinding(
            indicator_id="URL_USERINFO_PRESENT",
            observed_value=sanitize_observed_value(parsed.userinfo or "@ present"),
        )
    return None


@registry.register_url_rule("URL_NON_STANDARD_PORT")
def check_non_standard_port(parsed: ParsedUrl) -> TriggeredFinding | None:
    if parsed.port and parsed.port not in (80, 443):
        return TriggeredFinding(
            indicator_id="URL_NON_STANDARD_PORT",
            observed_value=sanitize_observed_value(f"Port {parsed.port}"),
        )
    return None


@registry.register_url_rule("URL_SHORTENER_DOMAIN")
def check_shortener(parsed: ParsedUrl) -> TriggeredFinding | None:
    domain = parsed.registrable_domain or parsed.host
    if domain in SHORTENER_DOMAINS or parsed.host in SHORTENER_DOMAINS:
        return TriggeredFinding(
            indicator_id="URL_SHORTENER_DOMAIN",
            observed_value=sanitize_observed_value(domain),
        )
    return None


@registry.register_url_rule("URL_SUSPICIOUS_TLD")
def check_suspicious_tld(parsed: ParsedUrl) -> TriggeredFinding | None:
    if parsed.tld and parsed.tld.lower() in SUSPICIOUS_TLDS:
        return TriggeredFinding(
            indicator_id="URL_SUSPICIOUS_TLD",
            observed_value=sanitize_observed_value(f".{parsed.tld}"),
        )
    return None


@registry.register_url_rule("URL_BRAND_IN_SUBDOMAIN")
def check_brand_in_subdomain(parsed: ParsedUrl) -> TriggeredFinding | None:
    if not parsed.subdomain_labels or not parsed.registrable_domain:
        return None

    full_sub = ".".join(parsed.subdomain_labels).lower()
    for brand, official_domains in BRAND_DOMAINS.items():
        if brand in full_sub and parsed.registrable_domain not in official_domains:
            return TriggeredFinding(
                indicator_id="URL_BRAND_IN_SUBDOMAIN",
                observed_value=sanitize_observed_value(
                    f"Brand '{brand}' on unrelated '{parsed.registrable_domain}'"
                ),
            )
    return None


@registry.register_url_rule("URL_CREDENTIAL_PATH_KEYWORD")
def check_credential_path_keyword(parsed: ParsedUrl) -> TriggeredFinding | None:
    path_lower = parsed.path.lower()
    for kw in CREDENTIAL_KEYWORDS:
        # Match as boundary or path component
        pattern = rf"(^|/|-|_){re.escape(kw)}(/|-|_|\.|$)"
        if re.search(pattern, path_lower):
            return TriggeredFinding(
                indicator_id="URL_CREDENTIAL_PATH_KEYWORD",
                observed_value=sanitize_observed_value(kw),
            )
    return None


@registry.register_url_rule("URL_HEX_ENCODED_CHARS")
def check_hex_encoded_chars(parsed: ParsedUrl) -> TriggeredFinding | None:
    combined = f"{parsed.path}?{parsed.query}"
    matches = re.findall(r"%[0-9a-fA-F]{2}", combined)
    if len(matches) >= 3:
        return TriggeredFinding(
            indicator_id="URL_HEX_ENCODED_CHARS",
            observed_value=sanitize_observed_value(f"{len(matches)} hex-encoded bytes"),
        )
    return None


@registry.register_url_rule("URL_DATA_OR_SCRIPT_SCHEME")
def check_data_or_script_scheme(parsed: ParsedUrl) -> TriggeredFinding | None:
    if parsed.scheme in ("data", "javascript", "vbscript", "blob"):
        return TriggeredFinding(
            indicator_id="URL_DATA_OR_SCRIPT_SCHEME",
            observed_value=sanitize_observed_value(parsed.scheme),
        )
    return None


@registry.register_url_rule("URL_DOUBLE_EXTENSION_PATH")
def check_double_extension(parsed: ParsedUrl) -> TriggeredFinding | None:
    # Look for patterns like .pdf.exe or .doc.vbs at end of path
    match = re.search(
        r"\.[a-zA-Z0-9]{2,5}\.(exe|scr|bat|cmd|ps1|msi|apk|vbs|zip)$", parsed.path.lower()
    )
    if match:
        return TriggeredFinding(
            indicator_id="URL_DOUBLE_EXTENSION_PATH",
            observed_value=sanitize_observed_value(match.group(0)),
        )
    return None


@registry.register_url_rule("URL_LOOKALIKE_CHAR_SUBST")
def check_lookalike_char_subst(parsed: ParsedUrl) -> TriggeredFinding | None:
    if parsed.host_is_ip or not parsed.registrable_domain:
        return None

    # Strip TLD and analyze domain name for digit substitution
    domain_name = parsed.registrable_domain.split(".")[0].lower()
    de_leeted = domain_name.translate(LEET_TRANS)

    if de_leeted != domain_name:
        for brand, official_domains in BRAND_DOMAINS.items():
            if (
                parsed.registrable_domain not in official_domains
                and brand in de_leeted
                and brand not in domain_name
            ):
                return TriggeredFinding(
                    indicator_id="URL_LOOKALIKE_CHAR_SUBST",
                    observed_value=sanitize_observed_value(domain_name),
                )
    return None


@registry.register_url_rule("URL_NO_HTTPS")
def check_no_https(parsed: ParsedUrl) -> TriggeredFinding | None:
    if parsed.scheme == "http":
        return TriggeredFinding(
            indicator_id="URL_NO_HTTPS",
            observed_value=sanitize_observed_value("http://"),
        )
    return None


@registry.register_url_rule("URL_MULTIPLE_AT_SYMBOLS")
def check_multiple_at_symbols(parsed: ParsedUrl) -> TriggeredFinding | None:
    if parsed.original.count("@") >= 2:
        return TriggeredFinding(
            indicator_id="URL_MULTIPLE_AT_SYMBOLS",
            observed_value=sanitize_observed_value(f"{parsed.original.count('@')} '@' symbols"),
        )
    return None


@registry.register_url_rule("URL_ZERO_WIDTH_CHARS")
def check_zero_width_chars(parsed: ParsedUrl) -> TriggeredFinding | None:
    for char in parsed.original:
        if char in ZERO_WIDTH_CHARS:
            return TriggeredFinding(
                indicator_id="URL_ZERO_WIDTH_CHARS",
                observed_value=sanitize_observed_value(f"U+{ord(char):04X}"),
            )
    return None


@registry.register_url_rule("URL_SUSPICIOUS_FILE_EXT")
def check_suspicious_file_ext(parsed: ParsedUrl) -> TriggeredFinding | None:
    path_lower = parsed.path.lower()
    for ext in SUSPICIOUS_EXTENSIONS:
        if path_lower.endswith(ext):
            return TriggeredFinding(
                indicator_id="URL_SUSPICIOUS_FILE_EXT",
                observed_value=sanitize_observed_value(ext),
            )
    return None


@registry.register_url_rule("URL_TARGET_IN_QUERY_PARAM")
def check_target_in_query(parsed: ParsedUrl) -> TriggeredFinding | None:
    if not parsed.query:
        return None

    try:
        query_dict = urllib.parse.parse_qs(parsed.query, keep_blank_values=True)
    except Exception:
        return None

    for param, values in query_dict.items():
        if param.lower() in OPEN_REDIRECT_PARAMS:
            for val in values:
                if "http://" in val or "https://" in val or "." in val:
                    return TriggeredFinding(
                        indicator_id="URL_TARGET_IN_QUERY_PARAM",
                        observed_value=sanitize_observed_value(f"{param}={val}"),
                    )
    return None


@registry.register_url_rule("URL_HYPHENS_IN_DOMAIN")
def check_hyphens_in_domain(parsed: ParsedUrl) -> TriggeredFinding | None:
    if parsed.registrable_domain and not parsed.host_is_ip:
        # Check host without TLD, ignoring xn-- prefix
        host_without_tld = parsed.host.rsplit(".", 1)[0] if "." in parsed.host else parsed.host
        host_clean = host_without_tld.replace("xn--", "")
        if host_clean.count("-") >= 3:
            return TriggeredFinding(
                indicator_id="URL_HYPHENS_IN_DOMAIN",
                observed_value=sanitize_observed_value(f"{host_clean.count('-')} hyphens in host"),
            )
    return None


@registry.register_url_rule("URL_DYNAMIC_DNS_HOST")
def check_dynamic_dns_host(parsed: ParsedUrl) -> TriggeredFinding | None:
    domain = parsed.registrable_domain or parsed.host
    if domain in DYNDNS_DOMAINS or any(parsed.host.endswith(f".{dy}") for dy in DYNDNS_DOMAINS):
        return TriggeredFinding(
            indicator_id="URL_DYNAMIC_DNS_HOST",
            observed_value=sanitize_observed_value(domain),
        )
    return None


@registry.register_url_rule("URL_EMBEDDED_IP_IN_HEX")
def check_embedded_ip_in_hex(parsed: ParsedUrl) -> TriggeredFinding | None:
    if parsed.ip_notation in ("decimal", "hex", "octal"):
        return TriggeredFinding(
            indicator_id="URL_EMBEDDED_IP_IN_HEX",
            observed_value=sanitize_observed_value(f"{parsed.ip_notation} encoded: {parsed.host}"),
        )
    return None


@registry.register_url_rule("URL_BRAND_IN_PATH_UNRELATED")
def check_brand_in_path(parsed: ParsedUrl) -> TriggeredFinding | None:
    if not parsed.registrable_domain or parsed.host_is_ip:
        return None

    path_lower = parsed.path.lower()
    path_collapsed = re.sub(r"[-_]", "", path_lower)
    for brand, official_domains in BRAND_DOMAINS.items():
        if parsed.registrable_domain not in official_domains:
            brand_collapsed = brand.replace("-", "").replace("_", "")
            # Check for brand token in path (exact with separators, or collapsed hyphens/underscores)
            if re.search(rf"(^|/|-|_){re.escape(brand)}(/|-|_|\.|$)", path_lower) or re.search(
                rf"(^|/){re.escape(brand_collapsed)}(/|\.|$)", path_collapsed
            ):
                return TriggeredFinding(
                    indicator_id="URL_BRAND_IN_PATH_UNRELATED",
                    observed_value=sanitize_observed_value(
                        f"Brand '{brand}' in path on '{parsed.registrable_domain}'"
                    ),
                )
    return None


@registry.register_url_rule("URL_SUSPICIOUS_QUERY_KEYWORD")
def check_suspicious_query_keyword(parsed: ParsedUrl) -> TriggeredFinding | None:
    if not parsed.query:
        return None

    try:
        query_dict = urllib.parse.parse_qs(parsed.query, keep_blank_values=True)
    except Exception:
        return None

    for param in query_dict:
        if param.lower() in SUSPICIOUS_QUERY_PARAMS:
            return TriggeredFinding(
                indicator_id="URL_SUSPICIOUS_QUERY_KEYWORD",
                observed_value=sanitize_observed_value(f"Param: {param}"),
            )
    return None


@registry.register_url_rule("URL_NUMERIC_ONLY_SUBDOMAIN")
def check_numeric_only_subdomain(parsed: ParsedUrl) -> TriggeredFinding | None:
    for label in parsed.subdomain_labels:
        if label.isdigit():
            return TriggeredFinding(
                indicator_id="URL_NUMERIC_ONLY_SUBDOMAIN",
                observed_value=sanitize_observed_value(f"Numeric label '{label}'"),
            )
    return None


@registry.register_url_rule("URL_WHITESPACE_OBFUSCATION")
def check_whitespace_obfuscation(parsed: ParsedUrl) -> TriggeredFinding | None:
    for ws in ("\t", "\n", "\r"):
        if ws in parsed.original:
            return TriggeredFinding(
                indicator_id="URL_WHITESPACE_OBFUSCATION",
                observed_value=sanitize_observed_value(f"Embedded escape: {repr(ws)}"),
            )
    return None


def analyze_url(parsed: ParsedUrl) -> list[TriggeredFinding]:
    """Execute all registered URL indicator rules and return triggered findings."""
    findings: list[TriggeredFinding] = []
    for rule in registry.url_rules.values():
        finding = rule(parsed)
        if finding:
            findings.append(finding)
    return findings
