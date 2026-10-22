"""Schemas for batch scanning creation, status polling, and item listing."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

BatchStatus = Literal["queued", "running", "completed", "cancelled", "failed"]
BatchItemStatus = Literal["pending", "running", "completed", "failed"]


class RejectedBatchItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    line: int
    value: str
    reason: str


class CreateBatchRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    urls: list[str] | None = Field(default=None, max_length=100)
    csv_text: str | None = None
    name: str | None = Field(default="Batch Scan", max_length=120)


class CreateBatchResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    status: BatchStatus
    total: int
    accepted: int
    rejected: list[RejectedBatchItem]


class BatchStatusResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    status: BatchStatus
    total: int
    completed: int
    failed: int
    summary_by_risk_level: dict[str, int]
    created_at: str
    finished_at: str | None = None


class BatchItemResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    input: str
    status: BatchItemStatus
    scan_id: str | None = None
    risk_score: int | None = None
    risk_level: str | None = None
    error: str | None = None


class ListBatchItemsResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    items: list[BatchItemResponse]
    next_cursor: str | None = None
