"""Pydantic schemas for Investigation Cases, Notes, Attachments, and Timeline."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.scan_history import ScanSummaryItem

CaseStatus = Literal["open", "in_progress", "resolved", "archived"]
CasePriority = Literal["low", "medium", "high"]
TimelineEventType = Literal["note_added", "scan_attached", "scan_detached", "status_changed"]


class StrictModel(BaseModel):
    """Base schema forbidding unknown parameters."""

    model_config = ConfigDict(extra="forbid", validate_default=True)


class CreateCaseRequest(StrictModel):
    """Payload for initializing a new investigation case."""

    title: str = Field(
        ..., min_length=1, max_length=120, description="Brief descriptive case title."
    )
    description: str | None = Field(
        default=None, max_length=2000, description="Optional case overview or scope."
    )
    priority: CasePriority = Field(default="medium", description="Urgency prioritization tier.")
    scan_ids: list[str] = Field(
        default_factory=list, max_length=50, description="Initial scans to associate."
    )


class UpdateCaseRequest(StrictModel):
    """Payload for mutating an existing case's attributes."""

    title: str | None = Field(default=None, min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=2000)
    status: CaseStatus | None = None
    priority: CasePriority | None = None


class CaseResponse(StrictModel):
    """Case summary model."""

    id: str
    title: str
    description: str | None
    status: CaseStatus
    priority: CasePriority
    scan_count: int = Field(ge=0)
    created_at: str
    updated_at: str


class ListCasesResponse(StrictModel):
    """Cursor-paginated list of cases."""

    items: list[CaseResponse]
    next_cursor: str | None = None


class AttachScanRequest(StrictModel):
    """Payload to link a scan to an investigation case."""

    scan_id: str


class CaseScanAttachmentResponse(StrictModel):
    """Result of linking a scan to a case."""

    case_id: str
    scan_id: str
    attached_at: str


class CreateNoteRequest(StrictModel):
    """Payload for appending a timestamped note to a case."""

    body: str = Field(
        ..., min_length=1, max_length=5000, description="Plain text investigation note."
    )


class UpdateNoteRequest(StrictModel):
    """Payload for editing a previously added note."""

    body: str = Field(..., min_length=1, max_length=5000)


class CaseNoteResponse(StrictModel):
    """Investigation case note representation."""

    id: str
    case_id: str
    body: str
    created_at: str
    updated_at: str


class CaseTimelineItem(StrictModel):
    """Chronological event entry in an investigation case timeline."""

    type: TimelineEventType
    occurred_at: str
    reference_id: str | None = None
    summary: str


class CaseDetailResponse(StrictModel):
    """Detailed case representation including attached scans, notes, and audit timeline."""

    id: str
    title: str
    description: str | None
    status: CaseStatus
    priority: CasePriority
    scan_count: int
    created_at: str
    updated_at: str
    scans: list[ScanSummaryItem]
    notes: list[CaseNoteResponse]
    highest_risk_level: str | None = None
    timeline: list[CaseTimelineItem]
