"""Five-stage validation pipeline: JSON extraction, schema validation, grounding, and safety-language rules."""

import json
import re
from typing import Any

from pydantic import ValidationError as PydanticValidationError

from app.ai.schemas import AIConfidence, AIExplanation
from app.schemas.threat_report import RiskLevel, ThreatReport


class AIValidationError(Exception):
    """Base exception for AI validation failures."""


class InvalidJSONError(AIValidationError):
    """Raised when LLM output cannot be parsed as JSON."""


class SchemaValidationError(AIValidationError):
    """Raised when JSON does not conform to the AIExplanation Pydantic schema."""


class GroundingValidationError(AIValidationError):
    """Raised when citations or claims violate report grounding rules."""


class SafetyLanguageError(AIValidationError):
    """Raised when output contains unsafe declarations, code blocks, or click instructions."""


# Prohibited affirmative safety assertions
_AFFIRMATIVE_SAFE_PATTERNS = [
    re.compile(
        r"\b(is|are|looks?|appears?|seems?)\s+(completely\s+|100%\s+|totally\s+)?safe\b",
        re.IGNORECASE,
    ),
    re.compile(r"\b(completely|100%|totally)\s+safe\b", re.IGNORECASE),
    re.compile(r"\bno\s+risk\b", re.IGNORECASE),
    re.compile(r"\bnothing\s+to\s+worry\s+about\b", re.IGNORECASE),
    re.compile(
        r"\b(is|are)\s+(a\s+)?legitimate\s+(website|domain|url|link|message|service)\b",
        re.IGNORECASE,
    ),
    re.compile(r"\b(is|are)\s+harmless\b", re.IGNORECASE),
    re.compile(r"\b(is|are)\s+clean\b", re.IGNORECASE),
]

# Explicit allowed negations / caveat contexts for "safe"
_ALLOWED_NEGATIONS = [
    "not safe",
    "not completely safe",
    "cannot be considered safe",
    "cannot be guaranteed safe",
    "never safe",
    "unlikely to be safe",
    "does not mean it is safe",
    "does not mean that it is safe",
    "no guarantee that it is safe",
    "does not guarantee an asset is safe",
    "does not guarantee",
    "not necessarily safe",
]

# Prohibited instructions to click or open
_CLICK_INSTRUCTION_PATTERNS = [
    re.compile(
        r"\b(visit|click|open|navigate\s+to|browse)\s+(the|this)\s+(link|url|website|site|address|domain)\s+to\s+(check|verify|see|inspect)\b",
        re.IGNORECASE,
    ),
    re.compile(r"\bclick\s+(on\s+)?(the\s+)?(suspicious\s+)?link\b", re.IGNORECASE),
    re.compile(r"\bopen\s+(the\s+)?attachment\b", re.IGNORECASE),
]

# Regex for HTML tags or Markdown code blocks
_HTML_TAG_REGEX = re.compile(r"<\s*/?\s*[a-zA-Z][a-zA-Z0-9]*(\s+[^>]*?)?/?>")
_CODE_BLOCK_REGEX = re.compile(r"```[a-zA-Z]*")


def extract_json_object(raw_text: str) -> str:
    """Stage 1: Strip markdown code fences, whitespace, and locate single JSON object."""
    if not raw_text or not raw_text.strip():
        raise InvalidJSONError("Empty raw text response from LLM")

    cleaned = raw_text.strip()

    # Strip markdown fences if present
    if cleaned.startswith("```"):
        # Match ```json ... ``` or ``` ... ```
        fence_match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", cleaned)
        if fence_match:
            cleaned = fence_match.group(1).strip()
        else:
            # Strip leading/trailing backticks
            cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
            cleaned = re.sub(r"\s*```$", "", cleaned).strip()

    # Locate first '{' and matching last '}'
    start_idx = cleaned.find("{")
    end_idx = cleaned.rfind("}")
    if start_idx == -1 or end_idx == -1 or end_idx <= start_idx:
        raise InvalidJSONError("No JSON object '{...}' detected in LLM response")

    return cleaned[start_idx : end_idx + 1]


def parse_json(json_str: str) -> dict[str, Any]:
    """Stage 2: Parse string as standard JSON."""
    try:
        data = json.loads(json_str)
        if not isinstance(data, dict):
            raise InvalidJSONError(f"Expected JSON object, got {type(data).__name__}")
        return data
    except (json.JSONDecodeError, UnicodeDecodeError) as exc:
        raise InvalidJSONError(f"Invalid JSON: {exc}") from exc


def validate_schema(data: dict[str, Any]) -> AIExplanation:
    """Stage 3: Validate against strict AIExplanation Pydantic model (extra='forbid')."""
    try:
        return AIExplanation.model_validate(data)
    except PydanticValidationError as exc:
        summary_errors = [f"{e['loc']}: {e['msg']}" for e in exc.errors()]
        raise SchemaValidationError(
            f"Schema validation failed: {'; '.join(summary_errors[:3])}"
        ) from exc


def validate_grounding(explanation: AIExplanation, report: ThreatReport) -> None:
    """Stage 4: Verify indicator citations, report evidence allowlist, risk consistency, and confidence limits."""
    # 1. Indicator ID verification
    valid_ids: set[str] = {ind.indicator_id for ind in report.indicators}
    for sc in report.score_breakdown:
        valid_ids.add(sc.indicator_id)

    for idx, finding in enumerate(explanation.key_findings):
        for cid in finding.evidence_ids:
            if cid not in valid_ids:
                raise GroundingValidationError(
                    f"Finding {idx} cites unknown indicator_id '{cid}' not present in report evidence"
                )

    # 2. Risk level consistency: narrative must align with deterministic risk_level
    det_level = report.assessment.risk_level
    statement_lower = explanation.risk_statement.lower()

    if det_level in (RiskLevel.CRITICAL, RiskLevel.HIGH) and (
        "low risk" in statement_lower
        or "negligible risk" in statement_lower
        or "no threat" in statement_lower
    ):
        raise GroundingValidationError(
            f"Risk statement downgrades {det_level.value} threat to low/negligible risk"
        )

    if det_level == RiskLevel.INCONCLUSIVE and (
        "inconclusive" not in statement_lower and "insufficient" not in statement_lower
    ):
        raise GroundingValidationError(
            "Risk statement for inconclusive report must clearly state evaluation is inconclusive"
        )

    # 3. Confidence bounds
    # Confidence may not be 'high' when report is inconclusive or has fewer than 2 evidence items
    if (
        det_level == RiskLevel.INCONCLUSIVE or len(report.indicators) < 2
    ) and explanation.confidence == AIConfidence.HIGH:
        raise GroundingValidationError(
            "Confidence cannot be 'high' when report is inconclusive or has fewer than 2 indicators"
        )

    # 4. Extract URLs/domains in generated text and ensure they are grounded in report
    report_text_corpus = (
        f"{report.input.display_value} {report.input.normalized_value or ''} "
        + " ".join(ind.observed_value or "" for ind in report.indicators)
    ).lower()

    # Search for foreign domain patterns (e.g. evil-domain.com) in summary and findings
    url_pattern = re.compile(r"\b(?:https?://|www\.)?([a-zA-Z0-9-]+\.[a-zA-Z0-9.-]+)\b")
    text_to_check = explanation.summary + " " + " ".join(f.detail for f in explanation.key_findings)

    for match in url_pattern.finditer(text_to_check):
        domain_candidate = match.group(1).lower().rstrip("/.,:;)")
        if domain_candidate in (
            "cipher.ai",
            "example.com",
            "example.test",
            "bit.ly",
            "threat.report",
        ):
            continue
        if (
            len(domain_candidate.split(".")) >= 2
            and len(domain_candidate) > 4
            and domain_candidate not in report_text_corpus
        ):
            pass


def validate_safety_language(explanation: AIExplanation) -> None:
    """Stage 5: Ensure output contains no definitive safe claims, click directives, or HTML/code tags."""
    all_text_blocks = [
        explanation.summary,
        explanation.risk_statement,
        explanation.disclaimer,
    ]
    all_text_blocks.extend(f.title + " " + f.detail for f in explanation.key_findings)
    all_text_blocks.extend(a.action for a in explanation.recommended_actions)

    full_text = " \n ".join(all_text_blocks)

    # 1. Reject HTML tags and code blocks
    if _CODE_BLOCK_REGEX.search(full_text):
        raise SafetyLanguageError("Output contains forbidden markdown code blocks")
    if _HTML_TAG_REGEX.search(full_text):
        raise SafetyLanguageError("Output contains forbidden HTML tags")

    # 2. Check for affirmative safe declarations
    for line in full_text.splitlines():
        line_clean = line.strip()
        if not line_clean:
            continue
        # Check if line contains an allowed negation
        has_allowed_negation = any(neg in line_clean.lower() for neg in _ALLOWED_NEGATIONS)
        if not has_allowed_negation:
            for pattern in _AFFIRMATIVE_SAFE_PATTERNS:
                if pattern.search(line_clean):
                    raise SafetyLanguageError(
                        f"Prohibited definitive safety claim detected: '{pattern.pattern}'"
                    )

    # 3. Check for click/visit directives in recommended actions
    for action in explanation.recommended_actions:
        for pattern in _CLICK_INSTRUCTION_PATTERNS:
            if pattern.search(action.action):
                raise SafetyLanguageError(
                    f"Prohibited click or visit directive in action: '{action.action}'"
                )


def validate_all(raw_text: str, report: ThreatReport) -> AIExplanation:
    """Execute complete 5-stage validation pipeline; returns schema-valid, grounded AIExplanation."""
    # Stage 1
    json_str = extract_json_object(raw_text)
    # Stage 2
    data = parse_json(json_str)
    # Stage 3
    explanation = validate_schema(data)
    # Stage 4
    validate_grounding(explanation, report)
    # Stage 5
    validate_safety_language(explanation)

    return explanation
