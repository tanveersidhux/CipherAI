"""Pydantic schemas for Scan History, Filters, and Scan Detail representations."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.threat_report import RiskLevel, ThreatReport


class StrictModel(BaseModel):
    """Base schema forbidding unknown parameters."""

    model_config = ConfigDict(extra="forbid", validate_default=True)


class ScanSummaryItem(StrictModel):
    """Compact summary item rendered within history tables, cards, and dashboards."""

    id: str = Field(..., description="Unique scan identifier.")
    scan_type: Literal["url", "message", "email"] = Field(..., description="Type of threat target scanned.")
    title: str = Field(..., description="Display title for the scan.")
    input_preview: str = Field(..., max_length=200, description="Safe truncated display preview.")
    risk_score: int = Field(..., ge=0, le=100, description="Computed risk score (0-100).")
    risk_level: RiskLevel = Field(..., description="Assigned risk severity tier.")
    is_pinned: bool = Field(default=False, description="Whether scan is pinned to top of history.")
    tags: list[str] = Field(
        default_factory=list, description="Associated user classification tags."
    )
    created_at: str = Field(..., description="ISO 8601 UTC timestamp of scan execution.")


class ListScansResponse(StrictModel):
    """Cursor-paginated envelope for scan history query results."""

    items: list[ScanSummaryItem]
    next_cursor: str | None = Field(
        default=None, description="Opaque cursor for retrieving next page."
    )


class UpdateScanRequest(StrictModel):
    """Payload for updating scan metadata, title, pinned status, or tags."""

    title: str | None = Field(default=None, min_length=1, max_length=120)
    is_pinned: bool | None = None
    tags: list[str] | None = Field(default=None, max_length=10)


class StoredScanDetail(ThreatReport):
    """Full stored threat report model including persistent metadata."""

    id: str | None = None
    title: str | None = None
    is_pinned: bool = False
    tags: list[str] = Field(default_factory=list)
    case_ids: list[str] = Field(default_factory=list)
    rescan_of_scan_id: str | None = None


class RescanComparison(StrictModel):
    """Risk change comparison between original scan and new re-scan."""

    previous_risk_score: int
    new_risk_score: int
    previous_risk_level: RiskLevel
    new_risk_level: RiskLevel
    changed_indicators: list[str] = Field(default_factory=list)


class RescanResponse(StrictModel):
    """Response returned by the re-scan endpoint."""

    scan: ThreatReport
    comparison: RescanComparison
