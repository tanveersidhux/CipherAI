"""Pydantic schemas for scan quality feedback submissions."""

from datetime import datetime
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field

FeedbackType = Literal["false_positive", "false_negative", "accurate", "other"]


class ScanFeedbackRequest(BaseModel):
    """Payload submitted by user or analyst evaluating a scan outcome."""

    model_config = ConfigDict(extra="forbid")

    feedback_type: FeedbackType = Field(
        ...,
        description="Categorization of the scan result accuracy.",
    )
    comments: Annotated[str | None, Field(max_length=500)] = Field(
        default=None,
        description="Optional sanitized notes explaining why the assessment was considered inaccurate.",
    )


class ScanFeedbackResponse(BaseModel):
    """Confirmation returned upon receiving scan quality feedback."""

    model_config = ConfigDict(extra="forbid")

    status: Literal["recorded"] = "recorded"
    scan_id: str = Field(..., description="ID of the evaluated scan.")
    feedback_type: FeedbackType = Field(..., description="Recorded feedback classification.")
    recorded_at: datetime = Field(..., description="UTC timestamp of submission.")
