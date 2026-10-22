"""Integration tests for GET /api/v1/health endpoint across all dependency states."""

import httpx
import pytest
from fastapi.testclient import TestClient
from pydantic import SecretStr

from app.api.v1.health import reset_health_cache
from app.core.config import Settings
from app.main import create_app
from app.schemas.health import HealthResponse


@pytest.fixture(autouse=True)
def clean_cache() -> None:
    """Ensure health cache is clean before each test."""
    reset_health_cache()


def test_health_not_configured_database(client: TestClient) -> None:
    """When Supabase credentials are not set, database reports not_configured."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()

    # Structural schema validation
    HealthResponse.model_validate(data)

    assert data["status"] == "ok"
    assert data["environment"] == "development"
    assert data["dependencies"]["database"] == "not_configured"
    assert data["dependencies"]["llm"] == "disabled"
    assert "timestamp" in data
    assert response.headers.get("X-Request-ID") is not None


def test_health_database_ok_with_mocked_http(monkeypatch: pytest.MonkeyPatch) -> None:
    """When Supabase is configured and returns 200, health reports database: ok."""
    settings = Settings(
        APP_ENV="development",
        SUPABASE_URL="https://example-project.supabase.co",
        SUPABASE_SERVICE_ROLE_KEY=SecretStr("mock_secret_service_role_key_value"),
    )
    app = create_app(settings=settings)

    # Mock httpx.AsyncClient.get
    async def mock_get(self: httpx.AsyncClient, url: str, **kwargs: object) -> httpx.Response:
        # Verify request parameters
        assert "example-project.supabase.co/rest/v1" in str(url)
        return httpx.Response(status_code=200, request=httpx.Request("GET", url))

    monkeypatch.setattr(httpx.AsyncClient, "get", mock_get)

    with TestClient(app) as test_client:
        response = test_client.get("/api/v1/health")
        assert response.status_code == 200
        data = response.json()
        assert data["dependencies"]["database"] == "ok"
        # Secret must never be in body or headers
        assert "mock_secret_service_role_key_value" not in response.text


def test_health_database_unavailable_on_error(monkeypatch: pytest.MonkeyPatch) -> None:
    """When Supabase returns error or network failure, reports database: unavailable."""
    settings = Settings(
        APP_ENV="development",
        SUPABASE_URL="https://example-project.supabase.co",
        SUPABASE_SERVICE_ROLE_KEY=SecretStr("mock_secret_key"),
    )
    app = create_app(settings=settings)

    async def mock_error_get(self: httpx.AsyncClient, url: str, **kwargs: object) -> httpx.Response:
        raise httpx.ConnectError("Connection refused", request=httpx.Request("GET", url))

    monkeypatch.setattr(httpx.AsyncClient, "get", mock_error_get)

    with TestClient(app) as test_client:
        response = test_client.get("/api/v1/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"  # API process itself is alive
        assert data["dependencies"]["database"] == "unavailable"


def test_health_database_unavailable_on_timeout(monkeypatch: pytest.MonkeyPatch) -> None:
    """When Supabase times out, reports database: unavailable."""
    settings = Settings(
        APP_ENV="development",
        SUPABASE_URL="https://example-project.supabase.co",
        SUPABASE_SERVICE_ROLE_KEY=SecretStr("mock_secret_key"),
    )
    app = create_app(settings=settings)

    async def mock_timeout_get(
        self: httpx.AsyncClient, url: str, **kwargs: object
    ) -> httpx.Response:
        raise httpx.TimeoutException("Read timed out", request=httpx.Request("GET", url))

    monkeypatch.setattr(httpx.AsyncClient, "get", mock_timeout_get)

    with TestClient(app) as test_client:
        response = test_client.get("/api/v1/health")
        assert response.status_code == 200
        data = response.json()
        assert data["dependencies"]["database"] == "unavailable"


def test_health_database_caching_within_10_seconds(monkeypatch: pytest.MonkeyPatch) -> None:
    """Multiple rapid calls within 10 seconds invoke the database probe only once."""
    settings = Settings(
        APP_ENV="development",
        SUPABASE_URL="https://example-project.supabase.co",
        SUPABASE_SERVICE_ROLE_KEY=SecretStr("mock_secret_key"),
    )
    app = create_app(settings=settings)

    call_count = 0

    async def mock_counting_get(
        self: httpx.AsyncClient, url: str, **kwargs: object
    ) -> httpx.Response:
        nonlocal call_count
        call_count += 1
        return httpx.Response(status_code=200, request=httpx.Request("GET", url))

    monkeypatch.setattr(httpx.AsyncClient, "get", mock_counting_get)

    with TestClient(app) as test_client:
        r1 = test_client.get("/api/v1/health")
        r2 = test_client.get("/api/v1/health")
        r3 = test_client.get("/api/v1/health")

        assert r1.status_code == 200
        assert r2.status_code == 200
        assert r3.status_code == 200
        assert call_count == 1  # Called only once due to cache!


def test_health_llm_status_states() -> None:
    """Health endpoint accurately reflects llm status without invoking any LLM provider."""
    # 1. Disabled
    app1 = create_app(Settings(LLM_ENABLED=False))
    with TestClient(app1) as tc1:
        res = tc1.get("/api/v1/health").json()
        assert res["dependencies"]["llm"] == "disabled"

    # 2. Enabled but missing key
    app2 = create_app(Settings(LLM_ENABLED=True, LLM_API_KEY=None))
    with TestClient(app2) as tc2:
        res = tc2.get("/api/v1/health").json()
        assert res["dependencies"]["llm"] == "not_configured"

    # 3. Enabled with key
    app3 = create_app(
        Settings(
            LLM_ENABLED=True,
            LLM_API_KEY=SecretStr("mock_llm_api_key_12345"),
        )
    )
    with TestClient(app3) as tc3:
        res = tc3.get("/api/v1/health").json()
        assert res["dependencies"]["llm"] == "enabled"


def test_health_database_probe_non_200_and_unexpected_exception(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Non-200 HTTP responses and generic exceptions from DB probe report unavailable."""
    settings = Settings(
        APP_ENV="development",
        SUPABASE_URL="https://example-project.supabase.co",
        SUPABASE_SERVICE_ROLE_KEY=SecretStr("mock_secret_key"),
    )
    app = create_app(settings=settings)

    # 1. Non-200/404 response (e.g. 500)
    async def mock_500_get(self: httpx.AsyncClient, url: str, **kwargs: object) -> httpx.Response:
        return httpx.Response(status_code=500, request=httpx.Request("GET", url))

    monkeypatch.setattr(httpx.AsyncClient, "get", mock_500_get)
    with TestClient(app) as tc:
        res = tc.get("/api/v1/health").json()
        assert res["dependencies"]["database"] == "unavailable"

    reset_health_cache()

    # 2. Unexpected generic exception
    async def mock_unexpected_get(
        self: httpx.AsyncClient, url: str, **kwargs: object
    ) -> httpx.Response:
        raise OSError("Simulated socket error")

    monkeypatch.setattr(httpx.AsyncClient, "get", mock_unexpected_get)
    with TestClient(app) as tc:
        res = tc.get("/api/v1/health").json()
        assert res["dependencies"]["database"] == "unavailable"
