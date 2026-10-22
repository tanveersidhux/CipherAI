"""Pydantic schemas for feature flags endpoint."""

from pydantic import BaseModel, ConfigDict


class ReputationProviderStatus(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str
    enabled: bool


class FeatureFlagsResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    reputation: bool
    email_analysis: bool
    batch: bool
    export: bool
    watchlists: bool
    notifications: bool
    collaboration: bool
    reputation_providers: list[ReputationProviderStatus]
