"""Integration tests for CORS, security headers, request body size limits, and doc gating."""

from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app


def test_cors_allowed_and_disallowed_origins() -> None:
    """Allowed origin receives Access-Control-Allow-Origin; disallowed origin does not."""
    settings = Settings(
        APP_ENV="development",
        CORS_ALLOWED_ORIGINS=["http://localhost:5173", "http://127.0.0.1:5173"],
    )
    app = create_app(settings=settings)

    with TestClient(app) as client:
        # Allowed origin
        res_allowed = client.get(
            "/api/v1/health",
            headers={"Origin": "http://localhost:5173"},
        )
        assert res_allowed.headers.get("access-control-allow-origin") == "http://localhost:5173"

        # Disallowed origin
        res_disallowed = client.get(
            "/api/v1/health",
            headers={"Origin": "http://evil-phishing-site.com"},
        )
        assert "access-control-allow-origin" not in res_disallowed.headers


def test_cors_preflight_options_request() -> None:
    """Preflight OPTIONS request returns 200 with appropriate CORS headers."""
    settings = Settings(
        APP_ENV="development",
        CORS_ALLOWED_ORIGINS=["http://localhost:5173"],
    )
    app = create_app(settings=settings)

    with TestClient(app) as client:
        response = client.options(
            "/api/v1/health",
            headers={
                "Origin": "http://localhost:5173",
                "Access-Control-Request-Method": "GET",
                "Access-Control-Request-Headers": "X-Request-ID,Content-Type",
            },
        )
        assert response.status_code == 200
        assert response.headers.get("access-control-allow-origin") == "http://localhost:5173"
        assert "GET" in response.headers.get("access-control-allow-methods", "")


def test_security_headers_present_on_all_responses(client: TestClient) -> None:
    """Security headers are present on success (200), not found (404), and error (500)."""
    endpoints = [
        "/api/v1/health",
        "/api/v1/non-existent-route",
        "/api/v1/test-error",
    ]

    for endpoint in endpoints:
        response = client.get(endpoint)
        headers = response.headers

        assert headers.get("X-Content-Type-Options") == "nosniff"
        assert headers.get("X-Frame-Options") == "DENY"
        assert headers.get("Referrer-Policy") == "no-referrer"
        assert "camera=()" in headers.get("Permissions-Policy", "")
        assert "no-store" in headers.get("Cache-Control", "")
        # Strict-Transport-Security must NOT be present in development
        assert "Strict-Transport-Security" not in headers


def test_hsts_header_present_in_production() -> None:
    """Strict-Transport-Security is enforced only when APP_ENV is production."""
    prod_settings = Settings(
        APP_ENV="production",
        CORS_ALLOWED_ORIGINS=["https://app.cipher-ai.com"],
    )
    prod_app = create_app(settings=prod_settings)

    with TestClient(prod_app) as prod_client:
        response = prod_client.get("/api/v1/health")
        assert response.status_code == 200
        assert "max-age=31536000" in response.headers.get("Strict-Transport-Security", "")


def test_request_body_size_limit_content_length() -> None:
    """Oversized Content-Length payload returns 413 INPUT_TOO_LARGE error envelope."""
    settings = Settings(
        APP_ENV="development",
        MAX_REQUEST_BODY_BYTES=1024,  # Small limit for test
    )
    app = create_app(settings=settings)

    with TestClient(app) as test_client:
        oversized_data = "x" * 2000
        response = test_client.post(
            "/api/v1/test-validate",
            content=oversized_data,
            headers={"Content-Type": "application/json"},
        )
        assert response.status_code == 413
        data = response.json()
        assert data["error"]["code"] == "INPUT_TOO_LARGE"
        assert response.headers.get("X-Request-ID") is not None


def test_request_body_size_limit_streamed_chunks() -> None:
    """Streamed chunks exceeding MAX_REQUEST_BODY_BYTES return 413 INPUT_TOO_LARGE."""
    from fastapi import Request

    settings = Settings(
        APP_ENV="development",
        MAX_REQUEST_BODY_BYTES=1024,
    )
    app = create_app(settings=settings)

    @app.post("/api/v1/test-stream")
    async def stream_endpoint(request: Request) -> dict[str, str]:
        await request.body()
        return {"status": "ok"}

    with TestClient(app) as test_client:
        # Generator for chunked transfer without Content-Length
        def chunk_generator():
            for _ in range(5):
                yield b"A" * 300  # Total 1500 bytes > 1024

        response = test_client.post(
            "/api/v1/test-stream",
            content=chunk_generator(),
            headers={"Content-Type": "application/json"},
        )
        assert response.status_code == 413
        data = response.json()
        assert data["error"]["code"] == "INPUT_TOO_LARGE"


def test_api_docs_gating_dev_vs_prod() -> None:
    """Interactive API docs (/docs, /redoc, /openapi.json) available in dev, hidden in prod."""
    # Dev mode
    dev_app = create_app(Settings(APP_ENV="development"))
    with TestClient(dev_app) as dev_client:
        assert dev_client.get("/docs").status_code == 200
        assert dev_client.get("/openapi.json").status_code == 200

    # Prod mode
    prod_app = create_app(
        Settings(
            APP_ENV="production",
            CORS_ALLOWED_ORIGINS=["https://app.cipher-ai.com"],
        )
    )
    with TestClient(prod_app) as prod_client:
        # Returns 404 in production
        assert prod_client.get("/docs").status_code == 404
        assert prod_client.get("/redoc").status_code == 404
        assert prod_client.get("/openapi.json").status_code == 404
