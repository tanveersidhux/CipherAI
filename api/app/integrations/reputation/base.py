"""Base definitions, schemas, and abstract classes for reputation providers."""

from abc import ABC, abstractmethod
from datetime import UTC, datetime, timedelta
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

ReputationStatus = Literal[
    "match_found",
    "no_match",
    "inconclusive",
    "provider_error",
    "rate_limited",
    "disabled",
]


class ReputationResult(BaseModel):
    """Normalized assessment returned by an external threat intelligence provider."""

    model_config = ConfigDict(extra="forbid")

    provider: str
    status: ReputationStatus
    categories: list[str] = Field(default_factory=list)
    checked_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    expires_at: datetime = Field(default_factory=lambda: datetime.now(UTC) + timedelta(hours=6))
    summary: str
    raw_ref: dict[str, Any] | None = None
    details: dict[str, Any] | None = None


class ReputationProvider(ABC):
    """Abstract base class for third-party reputation feeds."""

    name: str

    @abstractmethod
    def is_enabled(self) -> bool:
        """Return True if this provider is configured and active."""
        pass

    @abstractmethod
    async def check_url(self, normalized_url: str) -> ReputationResult:
        """Query provider threat intelligence for a normalized URL."""
        pass
