"""Scan request models for URL and message analysis endpoints."""

from enum import Enum

from pydantic import BaseModel, ConfigDict, Field


class MessageChannel(str, Enum):
    SMS = "sms"
    EMAIL_BODY = "email_body"
    CHAT = "chat"
    SOCIAL = "social"
    UNKNOWN = "unknown"


class ScanOptions(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=False)

    use_ai: bool = Field(default=True, description="Request AI-generated explanation when enabled.")
    persist: bool = Field(default=True, description="Persist threat report to history store.")


class UrlScanRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=False)

    url: str = Field(description="Target URL to analyze.")
    options: ScanOptions = Field(default_factory=ScanOptions)


class MessageScanRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=False)

    message: str = Field(description="Message body text to analyze.")
    channel: MessageChannel = Field(
        default=MessageChannel.UNKNOWN, description="Transmission channel."
    )
    options: ScanOptions = Field(default_factory=ScanOptions)
