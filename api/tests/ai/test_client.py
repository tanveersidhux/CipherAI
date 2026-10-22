"""Unit tests for HttpxLLMClient mocking httpx calls."""

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


def _create_client(provider: str = "anthropic") -> HttpxLLMClient:
    settings = Settings(
        APP_ENV="test",
        LLM_PROVIDER=provider,
        LLM_API_KEY=SecretStr("mock_key"),
        LLM_MODEL="claude-3-5-sonnet",
        LLM_BASE_URL="https://api.mock.test",
        LLM_TIMEOUT_SECONDS=5.0,
    )
    return HttpxLLMClient(settings)


@pytest.mark.asyncio
async def test_anthropic_call_success():
    client = _create_client(provider="anthropic")
    mock_resp = httpx.Response(
        status_code=200,
        json={"content": [{"type": "text", "text": '{"summary": "test"}'}]},
        request=httpx.Request("POST", "https://api.mock.test/v1/messages"),
    )

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_resp
        result = await client.generate_structured("sys prompt", "user prompt")
        assert result == '{"summary": "test"}'


@pytest.mark.asyncio
async def test_openai_call_success():
    client = _create_client(provider="openai")
    mock_resp = httpx.Response(
        status_code=200,
        json={"choices": [{"message": {"content": '{"summary": "openai"}'}}]},
        request=httpx.Request("POST", "https://api.mock.test/v1/chat/completions"),
    )

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_resp
        result = await client.generate_structured("sys prompt", "user prompt")
        assert result == '{"summary": "openai"}'


@pytest.mark.asyncio
async def test_anthropic_timeout_mapping():
    client = _create_client(provider="anthropic")

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.side_effect = httpx.TimeoutException("timeout")
        with pytest.raises(AITimeoutError):
            await client.generate_structured("sys", "user")


@pytest.mark.asyncio
async def test_anthropic_network_error_mapping():
    client = _create_client(provider="anthropic")

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.side_effect = httpx.ConnectError("connection refused")
        with pytest.raises(AINetworkError):
            await client.generate_structured("sys", "user")


@pytest.mark.asyncio
async def test_anthropic_rate_limit_mapping():
    client = _create_client(provider="anthropic")
    mock_resp = httpx.Response(
        status_code=429,
        request=httpx.Request("POST", "https://api.mock.test"),
    )

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_resp
        with pytest.raises(AIRateLimitError):
            await client.generate_structured("sys", "user")


@pytest.mark.asyncio
async def test_anthropic_provider_500_mapping():
    client = _create_client(provider="anthropic")
    mock_resp = httpx.Response(
        status_code=500,
        request=httpx.Request("POST", "https://api.mock.test"),
    )

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_resp
        with pytest.raises(AIProviderError):
            await client.generate_structured("sys", "user")
