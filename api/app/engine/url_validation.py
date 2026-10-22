"""Strict URL parsing, validation, normalization, and defanging without network access."""

import ipaddress
import os
import re
import urllib.parse
from dataclasses import dataclass

import idna
import tldextract

from app.core.errors import InputTooLargeError, InvalidUrlError

# Configure tldextract for offline operation using bundled snapshot
_OFFLINE_CACHE_DIR = os.path.join(os.path.dirname(__file__), ".tld_cache")
_EXTRACTOR = tldextract.TLDExtract(
    cache_dir=_OFFLINE_CACHE_DIR,
    suffix_list_urls=(),  # Disable remote download
)


@dataclass(frozen=True)
class ParsedUrl:
    """Immutable parsed URL representation holding lexical and structural facts."""

    original: str
    normalized: str
    scheme: str
    had_explicit_scheme: bool
    userinfo_present: bool
    userinfo: str | None
    host: str
    unicode_host: str
    host_is_ip: bool
    ip_version: int | None
    ip_notation: str  # "dotted", "decimal", "hex", "octal", "ipv6", "none"
    port: int | None
    path: str
    path_segments: tuple[str, ...]
    query: str
    fragment: str
    registrable_domain: str | None
    subdomain_labels: tuple[str, ...]
    tld: str | None
    is_idn: bool
    punycode_labels: tuple[str, ...]
    is_private_ip: bool = False


def is_ssrf_ip(ip: ipaddress.IPv4Address | ipaddress.IPv6Address) -> bool:
    """Determine whether an IP address is internal, private, loopback, link-local, multicast, or reserved."""
    if isinstance(ip, ipaddress.IPv6Address):
        if ip.ipv4_mapped:
            return is_ssrf_ip(ip.ipv4_mapped)
        return (
            ip.is_private
            or ip.is_loopback
            or ip.is_link_local
            or ip.is_multicast
            or ip.is_reserved
            or ip.is_unspecified
        )
    # IPv4 classifications
    return (
        ip.is_private
        or ip.is_loopback
        or ip.is_link_local
        or ip.is_multicast
        or ip.is_reserved
        or ip.is_unspecified
        or ip in ipaddress.IPv4Network("100.64.0.0/10")
        or ip in ipaddress.IPv4Network("198.18.0.0/15")
    )


def is_ssrf_host(host: str) -> bool:
    """Determine if a hostname is an SSRF target (internal name, loopback, cloud metadata, or private IP)."""
    clean_host = host.strip("[]").rstrip(".").lower()
    if clean_host in (
        "localhost",
        "instance-data",
        "metadata",
        "metadata.google.internal",
        "169.254.169.254",
        "127.0.0.1",
        "::1",
    ):
        return True

    if any(
        clean_host.endswith(suffix)
        for suffix in (
            ".localhost",
            ".local",
            ".internal",
            ".corp",
            ".lan",
            ".home",
            ".arpa",
            ".invalid",
            ".test",
        )
    ):
        return True

    is_ip, _, _, _, is_priv = _parse_ip_notation(clean_host)
    return is_ip and is_priv


def _parse_ip_notation(host: str) -> tuple[bool, int | None, str, str, bool]:
    """Parse potential IPv4 or IPv6 literals, identifying obfuscated notations.

    Returns:
        (is_ip, ip_version, notation_type, normalized_dotted_or_ipv6_host, is_private)
    """
    clean_host = host.rstrip(".")

    # IPv6 check: bracketed [::1] or bare fe80::1
    ipv6_body = (
        clean_host[1:-1]
        if (clean_host.startswith("[") and clean_host.endswith("]"))
        else clean_host
    )
    if ":" in ipv6_body:
        try:
            ip_obj = ipaddress.IPv6Address(ipv6_body)
            return True, 6, "ipv6", f"[{ip_obj.compressed}]", is_ssrf_ip(ip_obj)
        except ValueError:
            return False, None, "none", clean_host, False

    # Single-part octal with leading zero: 017700000001
    if clean_host.startswith("0") and len(clean_host) > 1 and clean_host.isdigit():
        try:
            val = int(clean_host, 8)
            if 0 <= val <= 0xFFFFFFFF:
                ip_obj = ipaddress.IPv4Address(val)
                return True, 4, "octal", str(ip_obj), is_ssrf_ip(ip_obj)
        except ValueError:
            pass

    # Decimal integer IPv4 (dword): 2130706433
    if clean_host.isdigit():
        val = int(clean_host)
        if 0 <= val <= 0xFFFFFFFF:
            try:
                ip_obj = ipaddress.IPv4Address(val)
                return True, 4, "decimal", str(ip_obj), is_ssrf_ip(ip_obj)
            except ValueError:
                pass

    # Hexadecimal single-value IPv4: 0x7f000001
    if re.fullmatch(r"0x[0-9a-fA-F]{1,8}", clean_host):
        try:
            val = int(clean_host, 16)
            if 0 <= val <= 0xFFFFFFFF:
                ip_obj = ipaddress.IPv4Address(val)
                return True, 4, "hex", str(ip_obj), is_ssrf_ip(ip_obj)
        except ValueError:
            pass

    # Multi-part IPv4 (2 to 4 parts: dotted decimal, hex components, or octal components)
    parts = clean_host.split(".")
    if 2 <= len(parts) <= 4:
        is_octal = False
        is_hex = False
        is_all_valid = True
        int_parts: list[int] = []

        for idx, p in enumerate(parts):
            if not p:
                is_all_valid = False
                break
            try:
                if p.startswith("0x") or p.startswith("0X"):
                    is_hex = True
                    val = int(p, 16)
                elif p.startswith("0") and len(p) > 1 and p.isdigit():
                    is_octal = True
                    val = int(p, 8)
                elif p.isdigit():
                    val = int(p, 10)
                else:
                    is_all_valid = False
                    break

                if idx < len(parts) - 1:
                    if not (0 <= val <= 255):
                        is_all_valid = False
                        break
                else:
                    max_part = (
                        0xFFFFFFFF
                        if len(parts) == 1
                        else (
                            0xFFFFFF if len(parts) == 2 else (0xFFFF if len(parts) == 3 else 0xFF)
                        )
                    )
                    if not (0 <= val <= max_part):
                        is_all_valid = False
                        break

                int_parts.append(val)
            except ValueError:
                is_all_valid = False
                break

        if is_all_valid and 2 <= len(int_parts) <= 4:
            if len(int_parts) == 4:
                combined_val = (
                    (int_parts[0] << 24) | (int_parts[1] << 16) | (int_parts[2] << 8) | int_parts[3]
                )
            elif len(int_parts) == 3:
                combined_val = (int_parts[0] << 24) | (int_parts[1] << 16) | int_parts[2]
            elif len(int_parts) == 2:
                combined_val = (int_parts[0] << 24) | int_parts[1]
            else:
                combined_val = int_parts[0]

            if 0 <= combined_val <= 0xFFFFFFFF:
                ip_obj = ipaddress.IPv4Address(combined_val)
                if is_hex:
                    notation = "hex"
                elif is_octal:
                    notation = "octal"
                else:
                    notation = "dotted"
                return True, 4, notation, str(ip_obj), is_ssrf_ip(ip_obj)

    return False, None, "none", clean_host, False


def parse_and_validate_url(raw: str, max_chars: int = 2048) -> ParsedUrl:
    """Parse, validate, and normalize a URL strictly without network lookups.

    Raises:
        InputTooLargeError: If raw length exceeds max_chars.
        InvalidUrlError: If URL is malformed, uses unsupported schemes, or has invalid syntax.
    """
    if raw is None:
        raise InvalidUrlError("URL cannot be empty.", issue="empty_input")

    trimmed = raw.strip()
    if not trimmed:
        raise InvalidUrlError("URL cannot be empty.", issue="empty_input")

    if len(trimmed) > max_chars:
        raise InputTooLargeError(
            f"URL length of {len(trimmed)} exceeds maximum limit of {max_chars} characters.",
            field="url",
            max_allowed=max_chars,
        )

    # Check for prohibited schemes early
    lower_raw = trimmed.lower()
    for forbidden in ("javascript:", "data:", "vbscript:", "file:", "ftp:", "blob:"):
        if lower_raw.startswith(forbidden):
            raise InvalidUrlError(
                f"URL uses unsupported scheme '{forbidden[:-1]}'. Only http and https are allowed.",
                issue="unsupported_scheme",
            )

    # Detect if scheme is explicitly present
    had_explicit_scheme = True
    if lower_raw.startswith("http://") or lower_raw.startswith("https://"):
        work_url = trimmed
    else:
        # Check if another scheme with colon is present before any slash
        scheme_match = re.match(r"^([a-zA-Z][a-zA-Z0-9+.-]*):", trimmed)
        if scheme_match:
            scheme_name = scheme_match.group(1).lower()
            if scheme_name not in ("http", "https"):
                raise InvalidUrlError(
                    f"Unsupported scheme '{scheme_name}'. Only HTTP and HTTPS are permitted.",
                    issue="unsupported_scheme",
                )
            work_url = trimmed
        else:
            # Default to http:// for analysis
            work_url = "http://" + trimmed
            had_explicit_scheme = False

    # Check for control characters in URL (allow whitespace tabs/newlines in path for obfuscation detection)
    for c in work_url:
        cp = ord(c)
        if (cp < 32 and c not in ("\t", "\n", "\r")) or cp == 127:
            raise InvalidUrlError(
                "URL contains illegal control characters.", issue="control_characters"
            )

    # Split with urllib.parse
    try:
        parsed = urllib.parse.urlsplit(work_url)
    except Exception as exc:
        raise InvalidUrlError("Malformed URL structure.", issue="malformed_syntax") from exc

    scheme = parsed.scheme.lower()
    if scheme not in ("http", "https"):
        raise InvalidUrlError(f"Unsupported scheme '{scheme}'.", issue="unsupported_scheme")

    # Authority extraction
    netloc = parsed.netloc
    if not netloc:
        raise InvalidUrlError("URL authority/host cannot be empty.", issue="empty_host")

    # Embedded whitespace check
    if any(ws in netloc for ws in (" ", "\t", "\r", "\n")):
        raise InvalidUrlError(
            "Host contains illegal embedded whitespace.", issue="whitespace_in_host"
        )

    # Userinfo extraction
    userinfo_present = False
    userinfo_val: str | None = None
    host_port = netloc

    if "@" in netloc:
        userinfo_present = True
        userinfo_val, host_port = netloc.rsplit("@", 1)

    # Port extraction
    port: int | None = None
    if ":" in host_port and not host_port.endswith("]"):
        # Split host and port (handling IPv6 brackets)
        if "]" in host_port:
            bracket_idx = host_port.rfind("]")
            colon_idx = host_port.find(":", bracket_idx)
            if colon_idx != -1:
                host_str = host_port[:colon_idx]
                port_str = host_port[colon_idx + 1 :]
            else:
                host_str = host_port
                port_str = ""
        else:
            host_str, port_str = host_port.rsplit(":", 1)

        if port_str:
            try:
                port = int(port_str)
                if not (1 <= port <= 65535):
                    raise InvalidUrlError(
                        f"Invalid port {port}. Must be between 1 and 65535.", issue="invalid_port"
                    )
            except ValueError:
                raise InvalidUrlError(
                    f"Malformed port '{port_str}'.", issue="invalid_port"
                ) from None
    else:
        host_str = host_port

    if not host_str:
        raise InvalidUrlError("Host cannot be empty.", issue="empty_host")

    # Check percent encoding in host
    try:
        decoded_host = urllib.parse.unquote(host_str)
    except Exception:
        raise InvalidUrlError(
            "Malformed percent encoding in host.", issue="malformed_percent_encoding"
        ) from None

    # Parse IP notation
    is_ip, ip_version, ip_notation, normalized_host, is_private = _parse_ip_notation(decoded_host)

    # Host length validation
    if len(normalized_host) > 253:
        raise InvalidUrlError(
            "Host exceeds maximum length of 253 characters.", issue="host_too_long"
        )

    # IDN & Punycode handling for non-IP hosts
    is_idn = False
    punycode_labels: list[str] = []
    unicode_host = normalized_host

    if not is_ip:
        clean_labels = normalized_host.rstrip(".").split(".")
        for label in clean_labels:
            if len(label) > 63:
                raise InvalidUrlError(
                    f"Host label '{label[:15]}...' exceeds 63 characters.",
                    issue="host_label_too_long",
                )
            if label.startswith("xn--"):
                punycode_labels.append(label)
                is_idn = True

        try:
            # Convert to IDNA / Punycode to validate
            ascii_host = idna.encode(normalized_host.rstrip(".")).decode("ascii")
            unicode_host = idna.decode(ascii_host)
            if any(ord(c) > 127 for c in unicode_host):
                is_idn = True
        except idna.IDNAError as exc:
            zero_width_chars = {
                "\u200b",
                "\u200c",
                "\u200d",
                "\ufeff",
                "\u202a",
                "\u202b",
                "\u202c",
                "\u202d",
                "\u202e",
            }
            if any(c in normalized_host for c in zero_width_chars):
                is_idn = True
                unicode_host = normalized_host
            else:
                raise InvalidUrlError(
                    f"Invalid Internationalized Domain Name: {exc}", issue="invalid_idna"
                ) from exc

    # Extract domain / TLD via offline tldextract
    registrable_domain: str | None = None
    subdomain_labels: list[str] = []
    tld: str | None = None

    if is_ip:
        registrable_domain = normalized_host
    else:
        extracted = _EXTRACTOR(normalized_host)
        tld = extracted.suffix.lower() if extracted.suffix else None
        registrable_domain = (
            extracted.registered_domain.lower() if extracted.registered_domain else None
        )
        if extracted.subdomain:
            subdomain_labels = [s.lower() for s in extracted.subdomain.split(".") if s]

    # Path segments
    path_val = parsed.path or "/"
    path_segments = tuple(p for p in path_val.split("/") if p)

    # Reconstruct normalized URL
    norm_netloc = normalized_host
    if port:
        norm_netloc = f"{norm_netloc}:{port}"
    if userinfo_val:
        norm_netloc = f"{userinfo_val}@{norm_netloc}"

    norm_url = urllib.parse.urlunsplit(
        (scheme, norm_netloc, path_val, parsed.query, parsed.fragment)
    )

    return ParsedUrl(
        original=trimmed,
        normalized=norm_url,
        scheme=scheme,
        had_explicit_scheme=had_explicit_scheme,
        userinfo_present=userinfo_present,
        userinfo=userinfo_val,
        host=normalized_host.lower(),
        unicode_host=unicode_host.lower(),
        host_is_ip=is_ip,
        ip_version=ip_version,
        ip_notation=ip_notation,
        port=port,
        path=path_val,
        path_segments=path_segments,
        query=parsed.query,
        fragment=parsed.fragment,
        registrable_domain=registrable_domain,
        subdomain_labels=tuple(subdomain_labels),
        tld=tld,
        is_idn=is_idn,
        punycode_labels=tuple(punycode_labels),
        is_private_ip=is_private,
    )


def build_defanged(parsed: ParsedUrl) -> str:
    """Produce safe defanged display representation: hxxp/hxxps and [.] notation."""
    defanged_scheme = "hxxps" if parsed.scheme == "https" else "hxxp"
    defanged_host = parsed.host.replace(".", "[.]")

    authority = defanged_host
    if parsed.port:
        authority = f"{authority}:{parsed.port}"
    if parsed.userinfo_present and parsed.userinfo:
        authority = f"{parsed.userinfo}@{authority}"

    result = f"{defanged_scheme}://{authority}{parsed.path}"
    if parsed.query:
        result = f"{result}?{parsed.query}"
    if parsed.fragment:
        result = f"{result}#{parsed.fragment}"
    return result
