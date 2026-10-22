"""Main FastAPI application entry point and application factory.

Provides create_app() factory, lifespan configuration, non-secret startup logging,
security header and error envelope registration, and router mounting.
"""

import logging
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.responses import JSONResponse

from app.api.v1.health import get_health, get_liveness, get_readiness
from app.api.v1.router import v1_router
from app.core.config import Settings, get_settings
from app.core.errors import register_exception_handlers
from app.core.logging import setup_logging
from app.core.middleware import setup_middleware
from app.schemas.health import HealthResponse, LivenessResponse, ReadinessResponse

logger = logging.getLogger("cipher.main")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Lifespan context manager for startup and shutdown hooks."""
    settings: Settings = app.state.settings

    # Initialize structured JSON logging
    setup_logging(log_level=settings.LOG_LEVEL)

    # Safe startup summary with ZERO secrets
    logger.info(
        "CIPHER AI API initialized",
        extra={
            "app_version": settings.APP_VERSION,
            "environment": settings.APP_ENV,
            "api_docs_enabled": bool(settings.ENABLE_API_DOCS),
            "database_configured": settings.is_database_configured,
            "llm_enabled": settings.LLM_ENABLED,
            "llm_status": settings.llm_status,
            "cors_origins_count": len(settings.CORS_ALLOWED_ORIGINS),
        },
    )

    yield

    logger.info("CIPHER AI API shutting down")


def create_app(settings: Settings | None = None) -> FastAPI:
    """Create and configure a FastAPI application instance."""
    resolved_settings = settings or get_settings()

    # Disable interactive documentation in production unless explicitly enabled
    docs_url = "/docs" if resolved_settings.ENABLE_API_DOCS else None
    redoc_url = "/redoc" if resolved_settings.ENABLE_API_DOCS else None
    openapi_url = "/openapi.json" if resolved_settings.ENABLE_API_DOCS else None

    app = FastAPI(
        title="CIPHER AI Threat Intelligence API",
        version=resolved_settings.APP_VERSION,
        description="Deterministic security analysis, AI explanations, and threat intelligence.",
        docs_url=docs_url,
        redoc_url=redoc_url,
        openapi_url=openapi_url,
        lifespan=lifespan,
    )

    # Store settings in application state and wire dependency override for isolation
    app.state.settings = resolved_settings
    app.dependency_overrides[get_settings] = lambda: resolved_settings

    # Register universal exception handlers
    register_exception_handlers(app)

    # Register middleware stack in documented order
    setup_middleware(app, resolved_settings)

    # Mount v1 router at /api/v1
    app.include_router(v1_router)

    # Minimal non-sensitive root endpoint pointing to health check
    @app.get("/", include_in_schema=False)
    async def root_index() -> JSONResponse:
        return JSONResponse(
            content={
                "name": "CIPHER AI Threat Intelligence API",
                "version": resolved_settings.APP_VERSION,
                "health": "/api/v1/health",
                "docs": docs_url,
            }
        )

    # Root /health alias for container orchestrators and cloud load balancers
    @app.get("/health", response_model=HealthResponse, include_in_schema=False)
    async def root_health() -> HealthResponse:
        return await get_health(resolved_settings)

    @app.get("/health/live", response_model=LivenessResponse, include_in_schema=False)
    async def root_liveness() -> LivenessResponse:
        return await get_liveness()

    @app.get("/health/ready", response_model=ReadinessResponse, include_in_schema=False)
    async def root_readiness() -> ReadinessResponse:
        return await get_readiness(resolved_settings)

    return app


# Default ASGI application entrypoint
app = create_app()
