"""LLM provider client abstraction and concrete HTTP implementations using httpx."""

import logging
import time
from typing import Any, Protocol, runtime_checkable

import httpx

from app.core.config import Settings
from app.core.metrics import metrics

logger = logging.getLogger("cipher.ai.client")


class AIClientError(Exception):
    """Base exception for AI client communication failures."""


class AITimeoutError(AIClientError):
    """Raised when an LLM provider request exceeds configured timeout."""


class AINetworkError(AIClientError):
    """Raised on socket/connection errors communicating with provider."""


class AIRateLimitError(AIClientError):
    """Raised when an LLM provider returns 429 Too Many Requests."""


class AIProviderError(AIClientError):
    """Raised when an LLM provider returns an HTTP 4xx/5xx response."""

    def __init__(self, message: str, status_code: int = 500) -> None:
        super().__init__(message)
        self.status_code = status_code


@runtime_checkable
class LLMClient(Protocol):
    """Protocol for LLM clients generating structured completions."""

    async def generate_structured(
        self,
        system_prompt: str,
        user_prompt: str,
        json_schema: dict[str, Any] | None = None,
        timeout_seconds: float = 12.0,
    ) -> str:
        """Send prompt to LLM provider and return raw text response."""
        ...


class HttpxLLMClient:
    """Production provider client communicating with Anthropic/OpenAI/Gemini via httpx."""

    def __init__(self, settings: Settings) -> None:
        self.provider = (settings.LLM_PROVIDER or "anthropic").lower().strip()
        self.model = settings.LLM_MODEL
        self.api_key = settings.LLM_API_KEY.get_secret_value() if settings.LLM_API_KEY else ""
        self.base_url = (settings.LLM_BASE_URL or "").rstrip("/")
        self.max_tokens = settings.LLM_MAX_OUTPUT_TOKENS
        self.timeout = settings.LLM_TIMEOUT_SECONDS

    async def generate_structured(
        self,
        system_prompt: str,
        user_prompt: str,
        json_schema: dict[str, Any] | None = None,
        timeout_seconds: float = 12.0,
    ) -> str:
        effective_timeout = timeout_seconds or self.timeout
        start_time = time.perf_counter()

        try:
            if self.provider == "anthropic":
                res = await self._call_anthropic(system_prompt, user_prompt, effective_timeout)
            elif self.provider in ("gemini", "google"):
                res = await self._call_gemini(system_prompt, user_prompt, effective_timeout)
            elif self.provider in ("openai", "compatible"):
                res = await self._call_openai(system_prompt, user_prompt, effective_timeout)
            else:
                res = await self._call_anthropic(system_prompt, user_prompt, effective_timeout)

            duration_ms = (time.perf_counter() - start_time) * 1000
            metrics.record_gemini_call("success", duration_ms)
            return res
        except AITimeoutError:
            duration_ms = (time.perf_counter() - start_time) * 1000
            metrics.record_gemini_call("timeout", duration_ms)
            raise
        except AIRateLimitError:
            duration_ms = (time.perf_counter() - start_time) * 1000
            metrics.record_gemini_call("rate_limit", duration_ms)
            raise
        except Exception:
            duration_ms = (time.perf_counter() - start_time) * 1000
            metrics.record_gemini_call("error", duration_ms)
            raise

    async def _call_gemini(self, system: str, user: str, timeout: float) -> str:
        model_name = self.model if "gemini" in self.model else "gemini-1.5-flash"
        base_endpoint = self.base_url or "https://generativelanguage.googleapis.com"
        url = f"{base_endpoint}/v1beta/models/{model_name}:generateContent?key={self.api_key}"

        headers = {
            "Content-Type": "application/json",
        }
        payload = {
            "system_instruction": {
                "parts": [{"text": system}],
            },
            "contents": [
                {
                    "role": "user",
                    "parts": [{"text": user}],
                }
            ],
            "generationConfig": {
                "responseMimeType": "application/json",
                "maxOutputTokens": self.max_tokens,
            },
        }

        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                resp = await client.post(url, headers=headers, json=payload)
        except httpx.TimeoutException as exc:
            raise AITimeoutError(f"Gemini request timed out after {timeout}s") from exc
        except httpx.NetworkError as exc:
            raise AINetworkError(f"Gemini network connection failed: {exc}") from exc
        except Exception as exc:
            raise AINetworkError(f"Unexpected connection error: {exc}") from exc

        if resp.status_code == 429:
            raise AIRateLimitError("Gemini API rate limit exceeded")
        if resp.status_code >= 400:
            raise AIProviderError(
                f"Gemini API returned status {resp.status_code}",
                status_code=resp.status_code,
            )

        try:
            data = resp.json()
            candidates = data.get("candidates", [])
            if not candidates:
                raise AIProviderError("Gemini returned empty candidates")
            parts = candidates[0].get("content", {}).get("parts", [])
            text_parts = [p.get("text", "") for p in parts]
            return "".join(text_parts)
        except Exception as exc:
            raise AIProviderError(f"Failed to parse Gemini response: {exc}") from exc

    async def _call_anthropic(self, system: str, user: str, timeout: float) -> str:
        url = f"{self.base_url or 'https://api.anthropic.com'}/v1/messages"
        headers = {
            "x-api-key": self.api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        }
        payload = {
            "model": self.model,
            "max_tokens": self.max_tokens,
            "system": system,
            "messages": [{"role": "user", "content": user}],
        }

        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                resp = await client.post(url, headers=headers, json=payload)
        except httpx.TimeoutException as exc:
            raise AITimeoutError(f"Anthropic request timed out after {timeout}s") from exc
        except httpx.NetworkError as exc:
            raise AINetworkError(f"Anthropic network connection failed: {exc}") from exc
        except Exception as exc:
            raise AINetworkError(f"Unexpected connection error: {exc}") from exc

        if resp.status_code == 429:
            raise AIRateLimitError("Anthropic API rate limit exceeded")
        if resp.status_code >= 400:
            raise AIProviderError(
                f"Anthropic API returned status {resp.status_code}",
                status_code=resp.status_code,
            )

        try:
            data = resp.json()
            # Anthropic returns content as a list of blocks
            content_blocks = data.get("content", [])
            text_blocks = [b.get("text", "") for b in content_blocks if b.get("type") == "text"]
            return "".join(text_blocks)
        except Exception as exc:
            raise AIProviderError(f"Failed to parse Anthropic response: {exc}") from exc

    async def _call_openai(self, system: str, user: str, timeout: float) -> str:
        url = f"{self.base_url or 'https://api.openai.com'}/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self.model,
            "max_tokens": self.max_tokens,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            "response_format": {"type": "json_object"},
        }

        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                resp = await client.post(url, headers=headers, json=payload)
        except httpx.TimeoutException as exc:
            raise AITimeoutError(f"OpenAI request timed out after {timeout}s") from exc
        except httpx.NetworkError as exc:
            raise AINetworkError(f"OpenAI network connection failed: {exc}") from exc
        except Exception as exc:
            raise AINetworkError(f"Unexpected connection error: {exc}") from exc

        if resp.status_code == 429:
            raise AIRateLimitError("OpenAI API rate limit exceeded")
        if resp.status_code >= 400:
            raise AIProviderError(
                f"OpenAI API returned status {resp.status_code}",
                status_code=resp.status_code,
            )

        try:
            data = resp.json()
            return data["choices"][0]["message"]["content"]
        except Exception as exc:
            raise AIProviderError(f"Failed to parse OpenAI response: {exc}") from exc
