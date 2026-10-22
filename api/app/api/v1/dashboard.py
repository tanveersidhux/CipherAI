"""API endpoint for Dashboard analytics and metrics."""

from fastapi import APIRouter, Depends, Query

from app.core.auth import CurrentUser, get_current_user
from app.core.errors import ValidationError
from app.repositories import get_analytics_repository
from app.repositories.analytics_repository import AnalyticsRepository
from app.schemas.dashboard import DashboardSummaryResponse

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get(
    "/summary",
    response_model=DashboardSummaryResponse,
    summary="Compute dashboard analytics and metrics for authenticated user",
)
def get_dashboard_summary_endpoint(
    range_days: int = Query(default=30, description="Time window in days for aggregations."),
    user: CurrentUser = Depends(get_current_user),
    repo: AnalyticsRepository = Depends(get_analytics_repository),
) -> DashboardSummaryResponse:
    """Compute dashboard analytics strictly scoped to the authenticated user's private scans."""
    if range_days not in (7, 30, 90):
        raise ValidationError("range_days must be one of 7, 30, or 90.")
    return repo.get_dashboard_summary(user_id=user.id, range_days=range_days)
