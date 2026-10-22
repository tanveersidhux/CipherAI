"""Pydantic schemas for the service health check endpoint.

Matches docs/api/openapi-draft.yaml HealthResponse schema.
"""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

DatabaseHealthStatus = Literal["ok", "unavailable", "not_configured"]
LlmHealthStatus = Literal["enabled", "disabled", "not_configured"]


class DependencyHealth(BaseModel):
    """Health and configuration status of external dependencies."""

    model_config = ConfigDict(extra="forbid")

    database: DatabaseHealthStatus = Field(
        ...,
        description="Reachability status of database subsystem (ok, unavailable, not_configured).",
    )
    llm: LlmHealthStatus = Field(
        ...,
        description="Readiness status of LLM provider (enabled, disabled, not_configured).",
    )


class HealthResponse(BaseModel):
    """Service operational health report."""

    model_config = ConfigDict(extra="forbid")

    status: Literal["ok"] = Field(
        default="ok",
        description="API service status ('ok' indicates service is alive and accepting traffic).",
    )
    app_version: str = Field(
        ...,
        description="Deployed semver application version.",
    )
    environment: Literal["development", "test", "production"] = Field(
        ...,
        description="Operating runtime environment.",
    )
    timestamp: datetime = Field(
        ...,
        description="ISO 8601 UTC timestamp of the health check generation.",
    )
    dependencies: DependencyHealth = Field(
        ...,
        description="Detailed readiness of downstream dependencies.",
    )
