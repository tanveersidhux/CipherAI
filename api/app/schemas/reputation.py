"""Schemas for external threat reputation refresh and responses."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

ReputationStatus = Literal[
    "match_found",
    "no_match",
    "inconclusive",
    "provider_error",
    "rate_limited",
    "disabled",
]


class ReputationCheckItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    provider: str
    status: ReputationStatus
    categories: list[str] = Field(default_factory=list)
    checked_at: datetime
    expires_at: datetime
    summary: str


class ReputationRefreshResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    scan_id: str
    results: list[ReputationCheckItem]
    risk_score: int
    risk_level: str
    reputation_contribution: int
