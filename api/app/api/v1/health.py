"""Health check endpoint and dependency inspection services.

Provides GET /api/v1/health with non-blocking, cached dependency status checks.
Never leaks secrets, internal URLs, or full tracebacks.
"""

import asyncio
import logging
import time
from datetime import UTC, datetime

import httpx
from fastapi import APIRouter, Depends

from app.core.config import Settings, get_settings
from app.schemas.health import (
    DatabaseHealthStatus,
    DependencyHealth,
    HealthResponse,
    LivenessResponse,
    ReadinessResponse,
)

logger = logging.getLogger("cipher.health")
router = APIRouter(tags=["System"])

# Cache state for database connectivity checks (10-second TTL)
_db_cache_lock = asyncio.Lock()
_last_db_status: DatabaseHealthStatus | None = None
_last_db_check_time: float = 0.0
DB_CACHE_TTL_SECONDS = 10.0


def reset_health_cache() -> None:
    """Clear cached health check state (used in testing)."""
    global _last_db_status, _last_db_check_time
    _last_db_status = None
    _last_db_check_time = 0.0


async def check_database_health(settings: Settings) -> DatabaseHealthStatus:
    """Check Supabase REST root reachability with in-memory caching."""
    global _last_db_status, _last_db_check_time

    if not settings.is_database_configured:
        return "not_configured"

    now = time.monotonic()
    if _last_db_status is not None and (now - _last_db_check_time) < DB_CACHE_TTL_SECONDS:
        return _last_db_status

    async with _db_cache_lock:
        # Re-check cache under lock
        now = time.monotonic()
        if _last_db_status is not None and (now - _last_db_check_time) < DB_CACHE_TTL_SECONDS:
            return _last_db_status

        status: DatabaseHealthStatus = "unavailable"
        try:
            supabase_url = settings.SUPABASE_URL.rstrip("/")  # type: ignore[union-attr]
            # Probe PostgREST root with minimal headers; never query user data
            rest_endpoint = f"{supabase_url}/rest/v1/"
            service_key = settings.SUPABASE_SERVICE_ROLE_KEY.get_secret_value()  # type: ignore[union-attr]

            headers = {
                "apikey": service_key,
                "Authorization": f"Bearer {service_key}",
            }

            async with httpx.AsyncClient(timeout=settings.DB_HEALTHCHECK_TIMEOUT_SECONDS) as client:
                response = await client.get(rest_endpoint, headers=headers)
                # PostgREST root returns 200 or 404 (if OpenAPI is disabled)
                if response.status_code in (200, 404):
                    status = "ok"
                elif response.status_code == 401:
                    # Supabase publishable keys require secret key on /rest/v1/; verify via Auth health
                    auth_endpoint = f"{supabase_url}/auth/v1/health"
                    auth_resp = await client.get(auth_endpoint, headers=headers)
                    if auth_resp.status_code == 200:
                        status = "ok"
                    else:
                        logger.warning(
                            "Database health probe returned non-healthy HTTP status: %d",
                            response.status_code,
                        )
                        status = "unavailable"
                else:
                    logger.warning(
                        "Database health probe returned non-healthy HTTP status: %d",
                        response.status_code,
                    )
                    status = "unavailable"
        except httpx.TimeoutException:
            logger.warning(
                "Database health probe timed out after %.1fs",
                settings.DB_HEALTHCHECK_TIMEOUT_SECONDS,
            )
            status = "unavailable"
        except httpx.RequestError as exc:
            logger.warning("Database health probe request error: %s", type(exc).__name__)
            status = "unavailable"
        except Exception as exc:
            logger.warning("Database health check unexpected error: %s", type(exc).__name__)
            status = "unavailable"

        _last_db_status = status
        _last_db_check_time = time.monotonic()
        return status


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Service Health Check",
    description="Returns operational status of the API and its downstream dependencies.",
)
async def get_health(
    settings: Settings = Depends(get_settings),
) -> HealthResponse:
    """Return API health report with dependency statuses."""
    db_status = await check_database_health(settings)

    return HealthResponse(
        status="ok",
        app_version=settings.APP_VERSION,
        environment=settings.APP_ENV,
        timestamp=datetime.now(UTC),
        dependencies=DependencyHealth(
            database=db_status,
            llm=settings.llm_status,
        ),
    )


@router.get(
    "/health/live",
    response_model=LivenessResponse,
    summary="Liveness Probe",
    description="Instant liveness check for container orchestration and process supervision.",
)
async def get_liveness() -> LivenessResponse:
    """Return 200 OK indicating ASGI process is healthy and scheduling requests."""
    return LivenessResponse(
        status="alive",
        timestamp=datetime.now(UTC),
    )


@router.get(
    "/health/ready",
    response_model=ReadinessResponse,
    summary="Readiness Probe",
    description="Evaluates critical database and runtime dependencies before accepting traffic.",
)
async def get_readiness(
    settings: Settings = Depends(get_settings),
) -> ReadinessResponse:
    """Return readiness state of downstream backing services."""
    db_status = await check_database_health(settings)
    # If database is configured and unavailable, status is degraded; otherwise ready
    is_degraded = settings.is_database_configured and db_status == "unavailable"

    return ReadinessResponse(
        status="degraded" if is_degraded else "ready",
        timestamp=datetime.now(UTC),
        dependencies=DependencyHealth(
            database=db_status,
            llm=settings.llm_status,
        ),
    )
