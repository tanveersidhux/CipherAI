"""Analytics repository interface."""

from abc import ABC, abstractmethod

from app.schemas.dashboard import DashboardSummaryResponse


class AnalyticsRepository(ABC):
    """Abstract interface for user dashboard metrics and aggregations."""

    @abstractmethod
    def get_dashboard_summary(
        self,
        user_id: str,
        range_days: int = 30,
    ) -> DashboardSummaryResponse:
        """Calculate dashboard totals, risk distribution, trends, and top indicators."""
        ...
