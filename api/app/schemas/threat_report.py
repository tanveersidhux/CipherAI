"""Pydantic v2 models strictly mirroring docs/api/schemas/*.json."""

from enum import Enum
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class ScanType(str, Enum):
    URL = "url"
    MESSAGE = "message"
    EMAIL = "email"
    BATCH_ITEM = "batch_item"


class RiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"
    INCONCLUSIVE = "inconclusive"


class Confidence(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class EvidenceKind(str, Enum):
    OBSERVED = "observed"
    INFERRED = "inferred"
    EXTERNAL = "external"


class Severity(str, Enum):
    INFO = "info"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class IndicatorCategory(str, Enum):
    URL_STRUCTURE = "url_structure"
    DOMAIN = "domain"
    HOMOGLYPH = "homoglyph"
    REDIRECT_SHORTENER = "redirect_shortener"
    CREDENTIAL_LURE = "credential_lure"
    URGENCY = "urgency"
    IMPERSONATION = "impersonation"
    PAYMENT_REQUEST = "payment_request"
    CONTACT_CHANNEL = "contact_channel"
    ATTACHMENT = "attachment"
    REPUTATION = "reputation"
    OTHER = "other"


class AIStatus(str, Enum):
    USED = "used"
    FALLBACK_USED = "fallback_used"
    DISABLED = "disabled"


class ExternalLookupStatus(str, Enum):
    NOT_ATTEMPTED = "not_attempted"
    COMPLETE = "complete"
    PARTIAL = "partial"
    UNAVAILABLE = "unavailable"


class ExternalEvidenceStatus(str, Enum):
    FLAGGED = "flagged"
    NOT_FLAGGED = "not_flagged"
    UNKNOWN = "unknown"
    ERROR = "error"
    RATE_LIMITED = "rate_limited"


class ExplanationGeneratedBy(str, Enum):
    LLM = "llm"
    DETERMINISTIC_FALLBACK = "deterministic_fallback"


class StrictBaseModel(BaseModel):
    """Base model enforcing clean types and forbidding extra fields."""

    model_config = ConfigDict(
        extra="forbid",
        strict=False,
        validate_default=True,
    )


class InputInfo(StrictBaseModel):
    display_value: str = Field(description="Defanged or truncated safe representation.")
    normalized_value: str | None = Field(
        default=None, description="Normalized representation used for analysis."
    )
    input_hash: str = Field(description="SHA-256 hash of normalized input.")
    input_length: int = Field(ge=0, description="Character count of original input.")


class Assessment(StrictBaseModel):
    risk_score: int = Field(ge=0, le=100)
    risk_level: RiskLevel
    confidence: Confidence
    verdict_label: str
    limitations: list[str]


class Indicator(StrictBaseModel):
    indicator_id: str = Field(pattern=r"^[A-Z0-9_]+$")
    category: IndicatorCategory
    evidence_kind: EvidenceKind
    title: str
    description: str
    observed_value: str | None = None
    severity: Severity
    triggered: bool


class ScoreContribution(StrictBaseModel):
    indicator_id: str = Field(pattern=r"^[A-Z0-9_]+$")
    points: int
    reason: str
    evidence_kind: EvidenceKind
    capped: bool


class ExternalEvidence(StrictBaseModel):
    source: str
    checked_at: str
    status: ExternalEvidenceStatus
    detail: str | None = None
    reference_url: str | None = None
    note: str


class KeyFinding(StrictBaseModel):
    text: str = Field(max_length=250)
    indicator_ids: list[str] = Field(min_length=1)


class AIExplanation(StrictBaseModel):
    summary: str = Field(max_length=600)
    key_findings: list[KeyFinding]
    user_guidance: str
    uncertainty_notes: str
    generated_by: ExplanationGeneratedBy
    model: str | None = None
    validated: bool


class RecommendedAction(StrictBaseModel):
    action_id: str = Field(pattern=r"^ACT_[A-Z0-9_]+$")
    priority: int = Field(ge=1)
    text: str
    applies_to_levels: list[RiskLevel]


class Processing(StrictBaseModel):
    duration_ms: int = Field(ge=0)
    ai_status: AIStatus
    external_lookup_status: ExternalLookupStatus


class ThreatReport(StrictBaseModel):
    model_config = ConfigDict(
        extra="ignore",
        strict=False,
        validate_default=True,
    )
    report_id: str
    schema_version: str = "1.0"
    scan_type: ScanType
    created_at: str
    input: InputInfo
    assessment: Assessment
    indicators: list[Indicator]
    score_breakdown: list[ScoreContribution]
    external_evidence: list[ExternalEvidence]
    ai_explanation: AIExplanation
    recommended_actions: list[RecommendedAction]
    engine_version: str
    processing: Processing

    # Phase 07 & History Persistence fields (backward-compatible defaults)
    scan_id: str | None = None
    persistence_status: Literal["saved", "not_saved_guest", "save_failed"] = "not_saved_guest"
    saved_at: str | None = None
    id: str | None = None
    title: str | None = None
    is_pinned: bool = False
    tags: list[str] = Field(default_factory=list)
    case_ids: list[str] = Field(default_factory=list)
    rescan_of_scan_id: str | None = None
    user_id: str | None = None

    # Phase 08 Advanced Capabilities fields
    reputation_results: list[dict] | None = None
    email_summary: dict | None = None
    extracted_urls: list[dict] | None = None
    attachments: list[dict] | None = None
