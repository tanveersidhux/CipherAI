"""Orchestrator for AI threat explanation generation with fallback resilience, semaphore concurrency, and validation."""

import asyncio
import logging
import time
from datetime import UTC, datetime

from app.ai.client import (
    AIClientError,
    AINetworkError,
    AIProviderError,
    AIRateLimitError,
    AITimeoutError,
    HttpxLLMClient,
    LLMClient,
)
from app.ai.fallback import build_phase05_fallback_explanation
from app.ai.prompts import (
    build_system_prompt,
    build_user_prompt,
    generate_random_delimiter,
)
from app.ai.sanitizer import build_llm_payload
from app.ai.schemas import (
    ExplanationMeta,
    ExplanationResponse,
    ExplanationSource,
    FallbackReason,
)
from app.ai.validator import (
    GroundingValidationError,
    InvalidJSONError,
    SafetyLanguageError,
    SchemaValidationError,
    validate_all,
)
from app.core.config import Settings, get_settings
from app.schemas.threat_report import ThreatReport

logger = logging.getLogger("cipher.ai.service")

# Global in-memory concurrency semaphore (lazy-initialized)
_SEMAPHORE: asyncio.Semaphore | None = None
_SEMAPHORE_LOCK = asyncio.Lock()

# Simple in-memory circuit breaker state
_CIRCUIT_FAILURES = 0
_CIRCUIT_LAST_FAILURE_TIME = 0.0
_CIRCUIT_THRESHOLD = 3
_CIRCUIT_COOLDOWN_SECONDS = 60.0


async def _get_semaphore(limit: int) -> asyncio.Semaphore:
    global _SEMAPHORE
    if _SEMAPHORE is None:
        async with _SEMAPHORE_LOCK:
            if _SEMAPHORE is None:
                _SEMAPHORE = asyncio.Semaphore(limit)
    return _SEMAPHORE


def _is_circuit_open(settings: Settings) -> bool:
    global _CIRCUIT_FAILURES, _CIRCUIT_LAST_FAILURE_TIME
    if not settings.AI_CIRCUIT_BREAKER_ENABLED:
        return False
    if _CIRCUIT_FAILURES >= _CIRCUIT_THRESHOLD:
        elapsed = time.monotonic() - _CIRCUIT_LAST_FAILURE_TIME
        if elapsed < _CIRCUIT_COOLDOWN_SECONDS:
            return True
        # Half-open: let next request try
        _CIRCUIT_FAILURES = 0
    return False


def _record_circuit_success() -> None:
    global _CIRCUIT_FAILURES
    _CIRCUIT_FAILURES = 0


def _record_circuit_failure() -> None:
    global _CIRCUIT_FAILURES, _CIRCUIT_LAST_FAILURE_TIME
    _CIRCUIT_FAILURES += 1
    _CIRCUIT_LAST_FAILURE_TIME = time.monotonic()


def _build_fallback_response(
    report: ThreatReport,
    reason: FallbackReason,
    start_time: float,
    prompt_injection_suspected: bool = False,
) -> ExplanationResponse:
    """Safely build a deterministic fallback response without raising."""
    duration_ms = max(0, int((time.monotonic() - start_time) * 1000))
    explanation = build_phase05_fallback_explanation(report)
    now_utc = datetime.now(UTC).isoformat()

    return ExplanationResponse(
        explanation=explanation,
        meta=ExplanationMeta(
            explanation_source=ExplanationSource.DETERMINISTIC_FALLBACK,
            model=None,
            fallback_reason=reason,
            prompt_injection_suspected=prompt_injection_suspected,
            latency_ms=duration_ms,
            generated_at=now_utc,
        ),
    )


async def explain_report(
    report: ThreatReport,
    audience_level: str = "simple",
    client: LLMClient | None = None,
    settings: Settings | None = None,
) -> ExplanationResponse:
    """Orchestrate AI threat explanation with strict validation, retry, and guaranteed deterministic fallback.

    This function never raises to the caller. All failure modes gracefully degrade
    to the deterministic fallback with an explanatory fallback_reason code.
    """
    start_time = time.monotonic()
    resolved_settings = settings or get_settings()

    # 1. Check if AI is enabled
    is_enabled = bool(
        resolved_settings.AI_ENABLED
        if resolved_settings.AI_ENABLED is not None
        else resolved_settings.LLM_ENABLED
    )
    if not is_enabled:
        return _build_fallback_response(report, FallbackReason.AI_DISABLED, start_time)

    # 2. Check provider API key
    api_key_str = (
        resolved_settings.LLM_API_KEY.get_secret_value().strip()
        if resolved_settings.LLM_API_KEY
        else ""
    )
    if not api_key_str:
        return _build_fallback_response(report, FallbackReason.MISSING_API_KEY, start_time)

    # 3. Check circuit breaker
    if _is_circuit_open(resolved_settings):
        return _build_fallback_response(report, FallbackReason.CIRCUIT_OPEN, start_time)

    # 4. Prepare sanitized payload and injection analysis
    try:
        payload, injection_suspected = build_llm_payload(
            report=report,
            audience_level=audience_level,
            max_input_chars=resolved_settings.AI_MAX_INPUT_CHARS,
        )
    except Exception as exc:
        logger.warning("Error preparing LLM payload: %s", exc)
        return _build_fallback_response(report, FallbackReason.INPUT_REJECTED, start_time)

    # 5. Acquire concurrency semaphore with 2-second timeout
    semaphore = await _get_semaphore(resolved_settings.AI_CONCURRENCY_LIMIT)
    try:
        await asyncio.wait_for(semaphore.acquire(), timeout=2.0)
    except TimeoutError:
        logger.warning("AI concurrency limit reached; request queued beyond 2s timeout")
        return _build_fallback_response(
            report,
            FallbackReason.RATE_LIMITED,
            start_time,
            prompt_injection_suspected=injection_suspected,
        )

    llm_client = client or HttpxLLMClient(resolved_settings)
    delimiter = generate_random_delimiter()
    system_prompt = build_system_prompt(delimiter)
    user_prompt = build_user_prompt(payload, delimiter)

    max_retries = resolved_settings.AI_MAX_RETRIES

    try:
        # Execution loop with at most 1 retry for malformed output
        current_user_prompt = user_prompt
        last_failure_reason = FallbackReason.PROVIDER_ERROR

        for attempt in range(max_retries + 1):
            try:
                raw_text = await llm_client.generate_structured(
                    system_prompt=system_prompt,
                    user_prompt=current_user_prompt,
                    timeout_seconds=resolved_settings.LLM_TIMEOUT_SECONDS,
                )
            except AITimeoutError:
                _record_circuit_failure()
                return _build_fallback_response(
                    report,
                    FallbackReason.TIMEOUT,
                    start_time,
                    prompt_injection_suspected=injection_suspected,
                )
            except AIRateLimitError:
                _record_circuit_failure()
                return _build_fallback_response(
                    report,
                    FallbackReason.RATE_LIMITED,
                    start_time,
                    prompt_injection_suspected=injection_suspected,
                )
            except AINetworkError:
                _record_circuit_failure()
                return _build_fallback_response(
                    report,
                    FallbackReason.NETWORK_ERROR,
                    start_time,
                    prompt_injection_suspected=injection_suspected,
                )
            except (AIProviderError, AIClientError):
                _record_circuit_failure()
                return _build_fallback_response(
                    report,
                    FallbackReason.PROVIDER_ERROR,
                    start_time,
                    prompt_injection_suspected=injection_suspected,
                )
            except Exception as exc:
                logger.warning("Unexpected error during LLM client call: %s", exc)
                _record_circuit_failure()
                return _build_fallback_response(
                    report,
                    FallbackReason.PROVIDER_ERROR,
                    start_time,
                    prompt_injection_suspected=injection_suspected,
                )

            # Validate output through five-stage pipeline
            try:
                validated_explanation = validate_all(raw_text, report)
                _record_circuit_success()
                duration_ms = max(0, int((time.monotonic() - start_time) * 1000))
                now_utc = datetime.now(UTC).isoformat()

                return ExplanationResponse(
                    explanation=validated_explanation,
                    meta=ExplanationMeta(
                        explanation_source=ExplanationSource.AI,
                        model=resolved_settings.LLM_MODEL,
                        fallback_reason=None,
                        prompt_injection_suspected=injection_suspected,
                        latency_ms=duration_ms,
                        generated_at=now_utc,
                    ),
                )
            except InvalidJSONError as exc:
                last_failure_reason = FallbackReason.INVALID_JSON
                validation_issue = f"The response was not valid JSON ({exc}). Output JSON only."
            except SchemaValidationError as exc:
                last_failure_reason = FallbackReason.SCHEMA_VALIDATION_FAILED
                validation_issue = f"Schema validation error: {exc}"
            except GroundingValidationError as exc:
                last_failure_reason = FallbackReason.GROUNDING_VALIDATION_FAILED
                validation_issue = f"Grounding violation: {exc}"
            except SafetyLanguageError:
                # Do not retry on explicit safety violations or injection compliance; immediately fall back
                return _build_fallback_response(
                    report,
                    FallbackReason.SCHEMA_VALIDATION_FAILED,
                    start_time,
                    prompt_injection_suspected=injection_suspected,
                )

            # If retries remain, append only the internal validation issue without untrusted text
            if attempt < max_retries:
                logger.info(
                    "Retrying AI explanation generation after validation failure: %s",
                    validation_issue,
                )
                current_user_prompt = (
                    f"{user_prompt}\n\n[RETRY NOTICE: Previous response failed validation: {validation_issue}. "
                    "Ensure exact JSON matching Target Output JSON Schema, valid indicator citations only, and no safe labels.]"
                )

        # Retries exhausted
        return _build_fallback_response(
            report,
            last_failure_reason,
            start_time,
            prompt_injection_suspected=injection_suspected,
        )

    finally:
        semaphore.release()
