"""CIPHER AI threat intelligence and evidence-grounded explanation package."""

from app.ai.fallback import (
    build_deterministic_explanation,
    build_phase05_fallback_explanation,
)
from app.ai.schemas import (
    AIConfidence,
    AIExplanation,
    AIStatusResponse,
    ExplainRequest,
    ExplanationMeta,
    ExplanationResponse,
    ExplanationSource,
    FallbackReason,
    KeyFinding,
    RecommendedAction,
)
from app.ai.service import explain_report

__all__ = [
    "AIConfidence",
    "AIExplanation",
    "AIStatusResponse",
    "ExplainRequest",
    "ExplanationMeta",
    "ExplanationResponse",
    "ExplanationSource",
    "FallbackReason",
    "KeyFinding",
    "RecommendedAction",
    "build_deterministic_explanation",
    "build_phase05_fallback_explanation",
    "explain_report",
]
