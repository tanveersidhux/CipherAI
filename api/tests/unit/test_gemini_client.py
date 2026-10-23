"""Unit tests for Gemini LLM provider integration and error handling."""

from unittest.mock import AsyncMock, patch

import httpx
import pytest
from pydantic import SecretStr

from app.ai.client import (
    AINetworkError,
    AIProviderError,
    AIRateLimitError,
    AITimeoutError,
    HttpxLLMClient,
)
from app.core.config import Settings


@pytest.fixture
def gemini_settings() -> Settings:
    return Settings(
        _env_file=None,
        APP_ENV="development",
        AI_ENABLED=True,
        GEMINI_API_KEY=SecretStr("fake-gemini-key"),
        LLM_PROVIDER="gemini",
        LLM_MODEL="gemini-1.5-flash",
    )


@pytest.mark.asyncio
async def test_gemini_client_success(gemini_settings: Settings):
    """Verify Gemini client constructs valid request payload and extracts text parts."""
    client = HttpxLLMClient(gemini_settings)
    mock_response = {
        "candidates": [
            {
                "content": {
                    "parts": [
                        {"text": '{"summary": "Potentially deceptive login portal detected."}'}
                    ]
                }
            }
        ]
    }

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_resp = AsyncMock(spec=httpx.Response)
        mock_resp.status_code = 200
        mock_resp.json.return_value = mock_response
        mock_post.return_value = mock_resp

        result = await client.generate_structured(
            system_prompt="Analyze threat",
            user_prompt="https://malicious-login.com",
        )

        assert '{"summary": "Potentially deceptive login portal detected."}' in result
        assert mock_post.called
        call_kwargs = mock_post.call_args[1]
        assert "key=fake-gemini-key" in mock_post.call_args[0][0]
        assert call_kwargs["json"]["generationConfig"]["responseMimeType"] == "application/json"


@pytest.mark.asyncio
async def test_gemini_client_rate_limited(gemini_settings: Settings):
    """Verify Gemini HTTP 429 raises AIRateLimitError."""
    client = HttpxLLMClient(gemini_settings)

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_resp = AsyncMock(spec=httpx.Response)
        mock_resp.status_code = 429
        mock_post.return_value = mock_resp

        with pytest.raises(AIRateLimitError):
            await client.generate_structured(
                system_prompt="Analyze threat",
                user_prompt="https://test.com",
            )


@pytest.mark.asyncio
async def test_gemini_client_timeout(gemini_settings: Settings):
    """Verify Gemini request timeout raises AITimeoutError."""
    client = HttpxLLMClient(gemini_settings)

    with (
        patch(
            "httpx.AsyncClient.post",
            new_callable=AsyncMock,
            side_effect=httpx.TimeoutException("Timeout"),
        ),
        pytest.raises(AITimeoutError),
    ):
        await client.generate_structured(
            system_prompt="Analyze threat",
            user_prompt="https://test.com",
        )


@pytest.mark.asyncio
async def test_gemini_client_network_error(gemini_settings: Settings):
    """Verify Gemini network failure raises AINetworkError."""
    client = HttpxLLMClient(gemini_settings)

    with (
        patch(
            "httpx.AsyncClient.post",
            new_callable=AsyncMock,
            side_effect=httpx.NetworkError("Failed to connect"),
        ),
        pytest.raises(AINetworkError),
    ):
        await client.generate_structured(
            system_prompt="Analyze threat",
            user_prompt="https://test.com",
        )


@pytest.mark.asyncio
async def test_gemini_client_empty_candidates(gemini_settings: Settings):
    """Verify empty candidates list raises AIProviderError."""
    client = HttpxLLMClient(gemini_settings)

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_resp = AsyncMock(spec=httpx.Response)
        mock_resp.status_code = 200
        mock_resp.json.return_value = {"candidates": []}
        mock_post.return_value = mock_resp

        with pytest.raises(AIProviderError, match="empty candidates"):
            await client.generate_structured(
                system_prompt="Analyze threat",
                user_prompt="https://test.com",
            )
