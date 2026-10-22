"""Reputation orchestration service.

Handles concurrency, caching, timeouts, scoring contributions,
and evidence row generation.
"""

import asyncio

from app.core.config import get_settings
from app.engine.url_validation import is_ssrf_host, parse_and_validate_url
from app.integrations.reputation.base import ReputationResult
from app.integrations.reputation.cache import get_reputation_cache
from app.integrations.reputation.registry import get_reputation_registry
from app.schemas.threat_report import (
    ExternalEvidence,
    ExternalEvidenceStatus,
)


def calculate_provider_contribution(result: ReputationResult) -> int:
    """Determine score contribution for a reputation match."""
    if result.status != "match_found":
        return 0

    cats = [c.upper() for c in result.categories]
    if any(m in cats for m in ["MALWARE", "MALWARE_DOWNLOAD"]):
        return 35
    if any(s in cats for s in ["SOCIAL_ENGINEERING", "PHISHING"]):
        return 35
    if any(p in cats for p in ["SUSPICIOUS", "POTENTIALLY_HARMFUL_APPLICATION"]):
        return 20
    return 25


class ReputationService:
    def __init__(self) -> None:
        self.cache = get_reputation_cache()
        self.registry = get_reputation_registry()

    async def evaluate_url(
        self, normalized_url: str
    ) -> tuple[list[ReputationResult], list[ExternalEvidence], int]:
        """Query reputation feeds with bounded timeout and return results + capped evidence."""
        settings = get_settings()
        if not settings.FEATURE_REPUTATION:
            return [], [], 0

        # Protect against SSRF: do not send external requests for loopback, private, or internal hosts
        try:
            parsed = parse_and_validate_url(normalized_url)
            if parsed.is_private_ip or is_ssrf_host(parsed.host):
                return [], [], 0
        except Exception:
            pass

        providers = self.registry.get_providers()
        if not providers:
            return [], [], 0

        async def fetch_one(provider) -> ReputationResult:
            # Check cache first
            cached = self.cache.get(normalized_url, provider.name)
            if cached:
                return cached
            try:
                res = await asyncio.wait_for(
                    provider.check_url(normalized_url),
                    timeout=settings.REPUTATION_TIMEOUT_SECONDS,
                )
                self.cache.set(normalized_url, res)
                return res
            except TimeoutError:
                return ReputationResult(
                    provider=provider.name,
                    status="inconclusive",
                    categories=[],
                    summary=f"{provider.name} request timed out within {settings.REPUTATION_TIMEOUT_SECONDS}s budget.",
                )
            except Exception:
                return ReputationResult(
                    provider=provider.name,
                    status="provider_error",
                    categories=[],
                    summary=f"{provider.name} check failed unexpectedly.",
                )

        tasks = [fetch_one(p) for p in providers]
        results = await asyncio.gather(*tasks)

        # Build evidence items and calculate score contributions with cap
        evidence_items: list[ExternalEvidence] = []
        raw_total_contribution = 0

        for res in results:
            contribution = calculate_provider_contribution(res)
            raw_total_contribution += contribution

            if res.status == "match_found":
                ext_status = ExternalEvidenceStatus.FLAGGED
                reason = f"Flagged by external threat intelligence ({res.provider}): {res.summary}"
            elif res.status == "no_match":
                ext_status = ExternalEvidenceStatus.NOT_FLAGGED
                reason = f"Not listed by {res.provider} at time of check. (Does not mean the link is safe)."
            elif res.status == "rate_limited":
                ext_status = ExternalEvidenceStatus.RATE_LIMITED
                reason = f"{res.provider} rate limited."
            elif res.status in ("provider_error", "timeout"):
                ext_status = ExternalEvidenceStatus.ERROR
                reason = f"External lookup {res.provider} failed: {res.summary}"
            else:
                ext_status = ExternalEvidenceStatus.UNKNOWN
                reason = f"External lookup {res.provider} was inconclusive: {res.summary}"

            evidence_items.append(
                ExternalEvidence(
                    source=f"external_reputation_{res.provider}",
                    checked_at=res.checked_at.isoformat()
                    if hasattr(res.checked_at, "isoformat")
                    else str(res.checked_at),
                    status=ext_status,
                    reference_url=(
                        res.details.get("reference_url")
                        if isinstance(getattr(res, "details", None), dict)
                        else (
                            res.raw_ref.get("reference_url")
                            if isinstance(getattr(res, "raw_ref", None), dict)
                            else None
                        )
                    ),
                    note=reason,
                )
            )

        # Enforce global reputation score cap
        capped_reputation_score = min(
            raw_total_contribution, settings.REPUTATION_MAX_SCORE_CONTRIBUTION
        )

        return results, evidence_items, capped_reputation_score


_reputation_service = ReputationService()


def get_reputation_service() -> ReputationService:
    return _reputation_service
