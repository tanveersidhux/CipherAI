"""Configuration and feature flags endpoint."""

from fastapi import APIRouter

from app.core.features import get_feature_flags_status
from app.schemas.features import FeatureFlagsResponse

router = APIRouter(prefix="/config", tags=["config"])


@router.get(
    "/features",
    response_model=FeatureFlagsResponse,
    summary="List available feature flags and integration providers",
    description="Returns public status of platform feature flags and active providers without exposing secrets.",
)
async def get_features() -> FeatureFlagsResponse:
    """Return enabled feature flags and active providers."""
    flags = get_feature_flags_status()
    return FeatureFlagsResponse(**flags)
