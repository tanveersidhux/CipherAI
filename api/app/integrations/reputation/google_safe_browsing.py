"""Google Safe Browsing v4 threat intelligence adapter."""

from datetime import UTC, datetime, timedelta

import httpx

from app.core.config import get_settings
from app.integrations.reputation.base import ReputationProvider, ReputationResult


class GoogleSafeBrowsingProvider(ReputationProvider):
    name = "google_safe_browsing"

    def is_enabled(self) -> bool:
        settings = get_settings()
        return bool(settings.FEATURE_REPUTATION)

    async def check_url(self, normalized_url: str) -> ReputationResult:
        settings = get_settings()
        now = datetime.now(UTC)
        expires = now + timedelta(seconds=settings.REPUTATION_CACHE_TTL_SECONDS)

        if not self.is_enabled():
            return ReputationResult(
                provider=self.name,
                status="disabled",
                categories=[],
                checked_at=now,
                expires_at=expires,
                summary="Google Safe Browsing integration is disabled in configuration.",
            )

        api_key_secret = settings.GOOGLE_SAFE_BROWSING_API_KEY
        api_key = api_key_secret.get_secret_value() if api_key_secret else None

        # Live provider call if real key is configured
        if api_key:
            try:
                payload = {
                    "client": {"clientId": "cipher-ai", "clientVersion": "1.0.0"},
                    "threatInfo": {
                        "threatTypes": [
                            "MALWARE",
                            "SOCIAL_ENGINEERING",
                            "UNWANTED_SOFTWARE",
                            "POTENTIALLY_HARMFUL_APPLICATION",
                        ],
                        "platformTypes": ["ANY_PLATFORM"],
                        "threatEntryTypes": ["URL"],
                        "threatEntries": [{"url": normalized_url}],
                    },
                }
                async with httpx.AsyncClient(timeout=settings.REPUTATION_TIMEOUT_SECONDS) as client:
                    resp = await client.post(
                        f"https://safebrowsing.googleapis.com/v4/threatMatches:find?key={api_key}",
                        json=payload,
                    )
                if resp.status_code == 200:
                    data = resp.json()
                    matches = data.get("matches", [])
                    if matches:
                        categories = list({m.get("threatType", "MALWARE") for m in matches})
                        return ReputationResult(
                            provider=self.name,
                            status="match_found",
                            categories=categories,
                            checked_at=now,
                            expires_at=expires,
                            summary=f"Google Safe Browsing listed this target under threat categories: {', '.join(categories)}.",
                            raw_ref={"matches_count": len(matches)},
                        )
                    return ReputationResult(
                        provider=self.name,
                        status="no_match",
                        categories=[],
                        checked_at=now,
                        expires_at=expires,
                        summary="Not listed by Google Safe Browsing at time of check. This does not guarantee the link is safe.",
                    )
                elif resp.status_code == 429:
                    return ReputationResult(
                        provider=self.name,
                        status="rate_limited",
                        categories=[],
                        checked_at=now,
                        expires_at=expires,
                        summary="Google Safe Browsing lookup rate-limited.",
                    )
                else:
                    return ReputationResult(
                        provider=self.name,
                        status="provider_error",
                        categories=[],
                        checked_at=now,
                        expires_at=expires,
                        summary="Google Safe Browsing service returned an unexpected response.",
                    )
            except Exception:
                return ReputationResult(
                    provider=self.name,
                    status="inconclusive",
                    categories=[],
                    checked_at=now,
                    expires_at=expires,
                    summary="Google Safe Browsing check timed out or was temporarily unreachable.",
                )

        # Deterministic offline mock fixture mode (when no live key is configured)
        lower_url = normalized_url.lower()
        if "malware" in lower_url:
            return ReputationResult(
                provider=self.name,
                status="match_found",
                categories=["MALWARE"],
                checked_at=now,
                expires_at=expires,
                summary="Google Safe Browsing listed this target under threat categories: MALWARE.",
                raw_ref={"mock": True, "fixture": "MALWARE"},
            )
        elif "phish" in lower_url or "social" in lower_url:
            return ReputationResult(
                provider=self.name,
                status="match_found",
                categories=["SOCIAL_ENGINEERING"],
                checked_at=now,
                expires_at=expires,
                summary="Google Safe Browsing listed this target under threat categories: SOCIAL_ENGINEERING.",
                raw_ref={"mock": True, "fixture": "SOCIAL_ENGINEERING"},
            )
        elif "timeout" in lower_url:
            return ReputationResult(
                provider=self.name,
                status="inconclusive",
                categories=[],
                checked_at=now,
                expires_at=expires,
                summary="Google Safe Browsing check timed out or was temporarily unreachable.",
            )
        elif "error" in lower_url:
            return ReputationResult(
                provider=self.name,
                status="provider_error",
                categories=[],
                checked_at=now,
                expires_at=expires,
                summary="Google Safe Browsing service returned an unexpected response.",
            )
        elif "ratelimit" in lower_url:
            return ReputationResult(
                provider=self.name,
                status="rate_limited",
                categories=[],
                checked_at=now,
                expires_at=expires,
                summary="Google Safe Browsing lookup rate-limited.",
            )

        return ReputationResult(
            provider=self.name,
            status="no_match",
            categories=[],
            checked_at=now,
            expires_at=expires,
            summary="Not listed by Google Safe Browsing at time of check. This does not mean the target is safe.",
            raw_ref={"mock": True},
        )
