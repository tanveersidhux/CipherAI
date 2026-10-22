"""Text sanitation, Unicode normalization, and adversarial character detection."""

import hashlib
import unicodedata

# Character code point ranges
ZERO_WIDTH_CHARS = {
    "\u200b",  # Zero width space
    "\u200c",  # Zero width non-joiner
    "\u200d",  # Zero width joiner
    "\ufeff",  # Zero width no-break space / BOM
    "\u200e",  # Left-to-right mark
    "\u200f",  # Right-to-left mark
}

BIDI_CONTROLS = {
    "\u202a",  # Left-to-Right Embedding
    "\u202b",  # Right-to-Left Embedding
    "\u202c",  # Pop Directional Formatting
    "\u202d",  # Left-to-Right Override
    "\u202e",  # Right-to-Left Override
    "\u2066",  # Left-to-Right Isolate
    "\u2067",  # Right-to-Left Isolate
    "\u2068",  # First Strong Isolate
    "\u2069",  # Pop Directional Isolate
}


def is_variation_selector(char: str) -> bool:
    cp = ord(char)
    return (0xFE00 <= cp <= 0xFE0F) or (0xE0100 <= cp <= 0xE01EF)


def is_private_use(char: str) -> bool:
    cp = ord(char)
    return (0xE000 <= cp <= 0xF8FF) or (0xF0000 <= cp <= 0xFFFFD) or (0x100000 <= cp <= 0x10FFFD)


def is_c0_or_c1_control(char: str) -> bool:
    cp = ord(char)
    # Exclude newline (\n = 10) and tab (\t = 9)
    if cp in (9, 10):
        return False
    # C0 controls: 0-31, 127
    if cp < 32 or cp == 127:
        return True
    # C1 controls: 128-159 (0x80 - 0x9F)
    return 0x80 <= cp <= 0x9F


def detect_hidden_characters(s: str) -> list[str]:
    """Identify zero-width characters, bidirectional overrides, and private-use characters."""
    anomalies: list[str] = []
    for char in s:
        cp = ord(char)
        if char in ZERO_WIDTH_CHARS:
            anomalies.append(f"U+{cp:04X} (zero-width)")
        elif char in BIDI_CONTROLS:
            anomalies.append(f"U+{cp:04X} (bidi-control)")
        elif is_variation_selector(char):
            anomalies.append(f"U+{cp:04X} (variation-selector)")
        elif is_private_use(char):
            anomalies.append(f"U+{cp:04X} (private-use)")
    return anomalies


def normalize_text(s: str) -> tuple[str, list[str]]:
    """Apply Unicode NFKC, strip harmful C0/C1 control characters, and report anomalies."""
    anomalies = detect_hidden_characters(s)

    # Normalize via NFKC
    nfkc_str = unicodedata.normalize("NFKC", s)

    # Strip harmful C0 and C1 control characters (preserve newline and tab)
    cleaned_chars: list[str] = []
    for char in nfkc_str:
        if is_c0_or_c1_control(char):
            anomalies.append(f"U+{ord(char):04X} (control-stripped)")
            continue
        cleaned_chars.append(char)

    return "".join(cleaned_chars), anomalies


def make_display_preview(s: str, max_len: int = 200) -> str:
    """Produce a truncated safe preview where hidden or bidirectional characters are rendered visibly."""
    if not s:
        return ""

    escaped: list[str] = []
    for char in s:
        cp = ord(char)
        if char in ZERO_WIDTH_CHARS or char in BIDI_CONTROLS or is_variation_selector(char):
            escaped.append(f"\\u{cp:04X}")
        elif is_c0_or_c1_control(char):
            escaped.append(f"\\x{cp:02X}")
        else:
            escaped.append(char)

    result = "".join(escaped)
    if len(result) > max_len:
        return result[: max_len - 3] + "..."
    return result


def sanitize_observed_value(s: str | None, max_len: int = 200) -> str | None:
    """Sanitize observed fragment for display in Indicator.observed_value."""
    if s is None:
        return None

    preview = make_display_preview(s, max_len=max_len)
    # Collapse multiple whitespace characters into single space
    cleaned = " ".join(preview.split())
    return cleaned[:max_len]


def sha256_hex(s: str) -> str:
    """Compute SHA-256 hash of normalized text."""
    return hashlib.sha256(s.encode("utf-8")).hexdigest()
