"""Bounded, linear-time text extraction for URLs, emails, phone numbers, and crypto addresses."""

import re
from dataclasses import dataclass

from app.engine.url_validation import ParsedUrl, parse_and_validate_url

MAX_EXTRACTED_URLS = 10
MAX_EXTRACTED_EMAILS = 5
MAX_EXTRACTED_PHONES = 5
MAX_EXTRACTED_WALLETS = 5

# Safe linear-time regexes without nested repetition
RE_EMAIL = re.compile(r"\b[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9.-]{1,255}\.[A-Za-z]{2,24}\b")
RE_PHONE = re.compile(r"(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b")
RE_BTC = re.compile(
    r"\b(?:1[a-km-zA-HJ-NP-Z1-9]{25,34}|3[a-km-zA-HJ-NP-Z1-9]{25,34}|bc1[a-zA-HJ-NP-Z0-9]{25,62})\b"
)
RE_ETH = re.compile(r"\b0x[a-fA-F0-9]{40}\b")

# URL pattern matching standard URLs, hxxp, [.] and (dot)
RE_RAW_URL = re.compile(
    r"\b(?:hxxps?|https?|ftp)://[^\s<>\"'{}|\\^`]+|(?<![@\w])[a-zA-Z0-9-]{1,63}(?:\[\.\]|\(dot\)|\.)(?:com|org|net|io|top|xyz|biz|info|ly|co|us|uk|de|online)(?:/[^\s<>\"'{}|\\^`]*)?",
    re.IGNORECASE,
)


@dataclass(frozen=True)
class ExtractedEntities:
    urls: list[ParsedUrl]
    raw_urls: list[str]
    emails: list[str]
    phone_numbers: list[str]
    crypto_wallets: list[str]
    cap_notes: list[str]


def clean_extracted_url_text(s: str) -> str:
    """Normalize defanged symbols and strip wrapping punctuation from an extracted URL."""
    cleaned = s.strip()
    # Strip trailing punctuation commonly trailing URLs in prose
    cleaned = cleaned.rstrip(".,;:!?'\")>]}")
    cleaned = cleaned.lstrip("(\"'{[<")
    # De-defang hxxp -> http, [.] -> ., (dot) -> .
    cleaned = re.sub(r"^hxxp", "http", cleaned, flags=re.IGNORECASE)
    cleaned = cleaned.replace("[.]", ".").replace("(dot)", ".").replace("[:]", ":")
    return cleaned


def extract_entities(text: str) -> ExtractedEntities:
    """Extract URLs, emails, phone numbers, and crypto wallets with strict bounding."""
    cap_notes: list[str] = []

    # 1. Emails
    emails: list[str] = []
    for match in RE_EMAIL.finditer(text):
        if len(emails) >= MAX_EXTRACTED_EMAILS:
            cap_notes.append(f"Email extraction capped at {MAX_EXTRACTED_EMAILS}")
            break
        emails.append(match.group(0))

    # 2. Phones
    phones: list[str] = []
    for match in RE_PHONE.finditer(text):
        if len(phones) >= MAX_EXTRACTED_PHONES:
            cap_notes.append(f"Phone extraction capped at {MAX_EXTRACTED_PHONES}")
            break
        val = match.group(0).strip()
        if len(re.sub(r"\D", "", val)) >= 10:
            phones.append(val)

    # 3. Crypto Wallets
    wallets: list[str] = []
    for match in RE_BTC.finditer(text):
        if len(wallets) >= MAX_EXTRACTED_WALLETS:
            cap_notes.append(f"Crypto wallet extraction capped at {MAX_EXTRACTED_WALLETS}")
            break
        wallets.append(match.group(0))
    if len(wallets) < MAX_EXTRACTED_WALLETS:
        for match in RE_ETH.finditer(text):
            if len(wallets) >= MAX_EXTRACTED_WALLETS:
                cap_notes.append(f"Crypto wallet extraction capped at {MAX_EXTRACTED_WALLETS}")
                break
            wallets.append(match.group(0))

    # 4. URLs (with non-raising validation)
    parsed_urls: list[ParsedUrl] = []
    raw_urls: list[str] = []
    for match in RE_RAW_URL.finditer(text):
        if len(parsed_urls) >= MAX_EXTRACTED_URLS:
            cap_notes.append(f"URL extraction capped at {MAX_EXTRACTED_URLS}")
            break
        raw_token = match.group(0)
        cleaned = clean_extracted_url_text(raw_token)
        try:
            parsed = parse_and_validate_url(cleaned)
            parsed_urls.append(parsed)
            raw_urls.append(cleaned)
        except Exception:
            # One malformed URL must never abort extraction
            continue

    return ExtractedEntities(
        urls=parsed_urls,
        raw_urls=raw_urls,
        emails=emails,
        phone_numbers=phones,
        crypto_wallets=wallets,
        cap_notes=cap_notes,
    )
