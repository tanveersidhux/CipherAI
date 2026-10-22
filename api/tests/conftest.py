"""Pytest test fixtures for CIPHER AI backend."""

from collections.abc import Generator

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app


@pytest.fixture
def default_settings() -> Settings:
    """Return isolated development settings."""
    return Settings(
        APP_ENV="development",
        APP_VERSION="1.0.0",
        LOG_LEVEL="INFO",
        CORS_ALLOWED_ORIGINS=["http://localhost:5173"],
        ENABLE_API_DOCS=True,
        SUPABASE_URL=None,
        SUPABASE_SERVICE_ROLE_KEY=None,
        LLM_ENABLED=False,
    )


@pytest.fixture
def test_app(default_settings: Settings) -> FastAPI:
    """Return FastAPI app instance with default settings and test routes."""
    app = create_app(settings=default_settings)

    # Add a route that raises an unhandled error for testing 500 envelope
    @app.get("/api/v1/test-error")
    def trigger_error() -> None:
        raise RuntimeError("Simulated internal catastrophic error with sensitive_trace_token_12345")

    # Add a post route to test validation error and body size
    from pydantic import BaseModel, Field

    class SampleBody(BaseModel):
        url: str = Field(..., max_length=50)

    @app.post("/api/v1/test-validate")
    def validate_route(payload: SampleBody) -> dict[str, str]:
        return {"status": "ok", "url": payload.url}

    return app


@pytest.fixture
def client(test_app: FastAPI) -> Generator[TestClient, None, None]:
    """Return TestClient for the test application."""
    with TestClient(test_app, raise_server_exceptions=False) as c:
        yield c
