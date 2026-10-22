"""Pydantic schemas for Dashboard metrics and aggregate analytics."""

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.scan_history import ScanSummaryItem


class StrictModel(BaseModel):
    """Base schema forbidding unknown parameters."""

    model_config = ConfigDict(extra="forbid", validate_default=True)


class DashboardTotals(StrictModel):
    """High-level metric count cards."""

    total_scans: int = Field(ge=0, description="Lifetime total scans performed by user.")
    scans_last_7_days: int = Field(ge=0, description="Total scans performed in the past 7 days.")
    high_or_critical_scans: int = Field(ge=0, description="Count of scans rated High or Critical.")
    inconclusive_scans: int = Field(ge=0, description="Count of scans rated Inconclusive.")
    open_cases: int = Field(ge=0, description="Count of active investigation cases.")


class RiskDistributionItem(StrictModel):
    """Count of scans per risk level category."""

    risk_level: str
    count: int = Field(ge=0)


class ScansOverTimeItem(StrictModel):
    """Daily scan throughput and high/critical volume for time series charting."""

    date: str = Field(description="ISO 8601 calendar date (YYYY-MM-DD).")
    count: int = Field(ge=0)
    high_or_critical: int = Field(ge=0)


class TopIndicatorCategoryItem(StrictModel):
    """Prevalent threat detection categories triggered across scans."""

    category: str
    count: int = Field(ge=0)


class DashboardSummaryResponse(StrictModel):
    """Aggregated dashboard response envelope computed strictly from user's data."""

    totals: DashboardTotals
    risk_distribution: list[RiskDistributionItem]
    scans_over_time: list[ScansOverTimeItem]
    top_indicator_categories: list[TopIndicatorCategoryItem]
    recent_scans: list[ScanSummaryItem]
    generated_at: str = Field(description="ISO 8601 UTC timestamp of analytics generation.")
