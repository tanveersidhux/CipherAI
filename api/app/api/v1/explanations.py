"""Explanations and AI status API endpoints."""

from fastapi import APIRouter, Depends, Request

from app.ai.schemas import AIStatusResponse, ExplainRequest, ExplanationResponse
from app.ai.service import explain_report
from app.core.config import Settings, get_settings
from app.core.rate_limit import rate_limit_dependency

router = APIRouter(tags=["AI Threat Intelligence"])


@router.post(
    "/explanations",
    response_model=ExplanationResponse,
    dependencies=[Depends(rate_limit_dependency)],
    summary="Generate an evidence-grounded AI explanation for a threat report",
)
async def generate_explanation_endpoint(
    req: ExplainRequest,
    request: Request,
    settings: Settings = Depends(get_settings),
) -> ExplanationResponse:
    """Generate an evidence-grounded explanation for a valid Phase 04 ThreatReport.

    The explanation is advisory only and never modifies the deterministic risk score or level.
    If the AI provider is unavailable, slow, or disabled, the endpoint returns HTTP 200
    with a deterministic fallback explanation and a machine-readable fallback_reason.
    """
    return await explain_report(
        report=req.report,
        audience_level=req.audience_level,
        settings=settings,
    )


@router.get(
    "/ai/status",
    response_model=AIStatusResponse,
    summary="Check AI subsystem configuration status",
)
def get_ai_status_endpoint(
    settings: Settings = Depends(get_settings),
) -> AIStatusResponse:
    """Return non-sensitive status of the AI threat intelligence subsystem."""
    is_enabled = bool(
        settings.AI_ENABLED if settings.AI_ENABLED is not None else settings.LLM_ENABLED
    )
    has_key = bool(settings.LLM_API_KEY and settings.LLM_API_KEY.get_secret_value().strip())
    return AIStatusResponse(
        ai_enabled=is_enabled,
        provider_configured=has_key,
        model=settings.LLM_MODEL if is_enabled else None,
    )
