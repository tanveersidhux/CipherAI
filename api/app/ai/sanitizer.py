"""Input sanitization, URL defanging, and prompt injection detection for the AI layer."""

import re
import unicodedata
from typing import Any

from app.schemas.threat_report import ThreatReport

# Control characters: ASCII 0-31 (except \t, \n, \r) and DEL (127) plus C1 controls (128-159)
_CONTROL_CHAR_REGEX = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]")

# Zero-width and invisible formatting characters
_ZERO_WIDTH_REGEX = re.compile(r"[\u200b-\u200d\ufeff\u00ad\u2060-\u206f]")

# URL pattern for defanging inside arbitrary text
_URL_REGEX = re.compile(r"\bhttps?://[^\s<>\"']+", re.IGNORECASE)

# High-confidence prompt injection heuristic patterns
_INJECTION_PATTERNS = [
    re.compile(
        r"ignore\s+(all\s+)?(previous|prior|above)\s+(instructions|prompts|rules|commands)",
        re.IGNORECASE,
    ),
    re.compile(r"system\s+(prompt|override|message|directive|instruction)", re.IGNORECASE),
    re.compile(
        r"(you\s+are\s+now|act\s+as)\s+(an?\s+)?(unrestricted|evil|admin|developer|jailbroken|system)",
        re.IGNORECASE,
    ),
    re.compile(
        r"disregard\s+(all\s+)?(safety|system|previous|prior)\s+(rules|guidelines|instructions)",
        re.IGNORECASE,
    ),
    re.compile(
        r"reveal\s+(your\s+)?(system\s+prompt|secret|instructions|developer\s+mode)", re.IGNORECASE
    ),
    re.compile(r"developer\s+(mode|message|override|directive)", re.IGNORECASE),
    re.compile(r"<\s*/?\s*(system|assistant|instruction|human|prompt)[^>]*>", re.IGNORECASE),
    re.compile(r"\[\s*(system|assistant|human|developer)\s*\]", re.IGNORECASE),
    re.compile(r"<\|(im_start|im_end|endoftext|system|user|assistant)\|>", re.IGNORECASE),
    re.compile(
        r"(classify|mark|declare|rate)\s+this\s+(as\s+)?(safe|clean|harmless|benign|trusted)",
        re.IGNORECASE,
    ),
    re.compile(r"\b(DAN|jailbreak|jailbroken)\b", re.IGNORECASE),
    re.compile(r"---+.*(system|prompt|instruction).*", re.IGNORECASE),
    re.compile(r"bypass\s+(all\s+)?(safety|filters|guardrails|restrictions)", re.IGNORECASE),
    re.compile(
        r"(print|output|repeat|display|dump)\s+(the\s+)?(above|initial|system\s+prompt|instructions)\s+(verbatim|word\s+for\s+word)?",
        re.IGNORECASE,
    ),
    re.compile(r"<\s*script[^>]*>", re.IGNORECASE),
    re.compile(r"[A-Za-z0-9+/=]{80,}"),  # Suspicious long base64 payload
]


def sanitize_untrusted_text(text: str | None) -> str:
    """Normalize unicode (NFKC), strip non-printable/zero-width characters, collapse whitespace."""
    if not text:
        return ""

    # 1. NFKC unicode normalization
    normalized = unicodedata.normalize("NFKC", text)

    # 2. Strip zero-width & non-printing characters
    normalized = _ZERO_WIDTH_REGEX.sub("", normalized)

    # 3. Strip control characters
    normalized = _CONTROL_CHAR_REGEX.sub("", normalized)

    # 4. Normalize linebreaks and collapse excessive whitespace
    normalized = re.sub(r"\r\n|\r", "\n", normalized)
    normalized = re.sub(r"[ \t]+", " ", normalized)
    normalized = re.sub(r"\n{3,}", "\n\n", normalized)

    return normalized.strip()


def defang_urls(text: str | None) -> str:
    """Defang all URL references (http -> hxxp, domain dots -> [.]) so links cannot be live."""
    if not text:
        return ""

    def _replace_url(match: re.Match) -> str:
        url = match.group(0)
        # Scheme replacement
        if url.lower().startswith("https://"):
            defanged = "hxxps://" + url[8:]
        elif url.lower().startswith("http://"):
            defanged = "hxxp://" + url[7:]
        else:
            defanged = url

        # Defang dots in the authority/host section
        parts = defanged.split("/", 3)
        if len(parts) >= 3:
            parts[2] = parts[2].replace(".", "[.]")
            return "/".join(parts)
        return defanged.replace(".", "[.]")

    return _URL_REGEX.sub(_replace_url, text)


def truncate_total(text: str | None, max_chars: int = 4000) -> str:
    """Truncate text to max_chars with clean indicator."""
    if not text:
        return ""
    if len(text) <= max_chars:
        return text
    cutoff = max_chars - 16
    return text[:cutoff] + "...[TRUNCATED]"


def detect_injection_patterns(text: str | None) -> bool:
    """Detect whether untrusted text exhibits prompt-injection signatures."""
    if not text:
        return False

    cleaned = sanitize_untrusted_text(text)
    # Also test collapsed spaces variant (e.g. i g n o r e   p r e v i o u s)
    spaced_variant = re.sub(r"\s+", "", cleaned)

    for pattern in _INJECTION_PATTERNS:
        if pattern.search(cleaned):
            return True

    # Check for spaced-out "ignoreprevious" or "systemprompt"
    return bool(
        "ignoreprevious" in spaced_variant.lower() or "systemprompt" in spaced_variant.lower()
    )


def build_llm_payload(
    report: ThreatReport,
    audience_level: str = "simple",
    max_input_chars: int = 4000,
) -> tuple[dict[str, Any], bool]:
    """Extract and prepare bounded, defanged, privacy-preserving payload for the LLM.

    Returns:
        (sanitized_payload_dict, prompt_injection_suspected)
    """
    raw_content = report.input.normalized_value or report.input.display_value
    sanitized_text = sanitize_untrusted_text(raw_content)
    defanged_text = defang_urls(sanitized_text)
    truncated_text = truncate_total(defanged_text, max_chars=max_input_chars)

    injection_suspected = detect_injection_patterns(sanitized_text)

    # Map score breakdown to per-indicator points map
    score_map: dict[str, int] = {}
    reason_map: dict[str, str] = {}
    for sc in report.score_breakdown:
        score_map[sc.indicator_id] = sc.points
        reason_map[sc.indicator_id] = sc.reason

    evidence_items = []
    for ind in report.indicators:
        observed = (
            defang_urls(sanitize_untrusted_text(ind.observed_value)) if ind.observed_value else None
        )
        evidence_items.append(
            {
                "id": ind.indicator_id,
                "category": ind.category.value,
                "title": ind.title,
                "description": ind.description,
                "observed_value": observed,
                "severity": ind.severity.value,
                "score_contribution": score_map.get(ind.indicator_id, 0),
                "reason": reason_map.get(ind.indicator_id, ""),
            }
        )

    target_defanged = defang_urls(sanitize_untrusted_text(report.input.display_value))

    payload = {
        "target": target_defanged,
        "target_type": report.scan_type.value,
        "risk_level": report.assessment.risk_level.value,
        "risk_score": report.assessment.risk_score,
        "confidence": report.assessment.confidence.value,
        "verdict_label": report.assessment.verdict_label,
        "limitations": report.assessment.limitations,
        "evidence": evidence_items,
        "untrusted_content_excerpt": truncated_text,
        "audience_level": audience_level,
    }

    return payload, injection_suspected
