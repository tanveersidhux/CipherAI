"""ThreatReport assembly with deterministic clock and ID factory injection."""

import datetime
import uuid
from collections.abc import Callable

from app.engine.actions import get_recommended_actions
from app.engine.scoring import ScoringOutcome
from app.engine.scoring_config import ENGINE_VERSION
from app.schemas.threat_report import (
    AIExplanation,
    AIStatus,
    Assessment,
    ExternalLookupStatus,
    InputInfo,
    Processing,
    RecommendedAction,
    ScanType,
    ThreatReport,
)


def default_id_factory() -> str:
    return str(uuid.uuid4())


def default_clock() -> str:
    return datetime.datetime.now(datetime.UTC).isoformat()


def build_report(
    scan_type: ScanType,
    display_value: str,
    normalized_value: str | None,
    input_hash: str,
    input_length: int,
    scoring_outcome: ScoringOutcome,
    explanation: AIExplanation,
    duration_ms: int,
    actions: list[RecommendedAction] | None = None,
    id_factory: Callable[[], str] | None = None,
    clock: Callable[[], str] | None = None,
) -> ThreatReport:
    """Assemble a canonical ThreatReport conforming strictly to the Phase 01 JSON Schema."""
    generate_id = id_factory or default_id_factory
    get_time = clock or default_clock

    report_id = generate_id()
    created_at = get_time()

    # If actions not explicitly supplied, derive from scoring outcome
    if actions is None:
        indicator_ids = {ind.indicator_id for ind in scoring_outcome.indicators}
        actions = get_recommended_actions(
            scan_type=scan_type,
            level=scoring_outcome.risk_level,
            indicator_ids=indicator_ids,
        )

    return ThreatReport(
        report_id=report_id,
        schema_version="1.0",
        scan_type=scan_type,
        created_at=created_at,
        input=InputInfo(
            display_value=display_value,
            normalized_value=normalized_value,
            input_hash=input_hash,
            input_length=input_length,
        ),
        assessment=Assessment(
            risk_score=scoring_outcome.risk_score,
            risk_level=scoring_outcome.risk_level,
            confidence=scoring_outcome.confidence,
            verdict_label=scoring_outcome.verdict_label,
            limitations=scoring_outcome.limitations,
        ),
        indicators=scoring_outcome.indicators,
        score_breakdown=scoring_outcome.score_breakdown,
        external_evidence=[],  # No external lookup attempted in Phase 04
        ai_explanation=explanation,
        recommended_actions=actions,
        engine_version=ENGINE_VERSION,
        processing=Processing(
            duration_ms=duration_ms,
            ai_status=AIStatus.DISABLED,
            external_lookup_status=ExternalLookupStatus.NOT_ATTEMPTED,
        ),
    )
