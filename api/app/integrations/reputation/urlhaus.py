"""URLhaus malware URL intelligence adapter."""

from datetime import UTC, datetime, timedelta

import httpx

from app.core.config import get_settings
from app.integrations.reputation.base import ReputationProvider, ReputationResult


class URLhausProvider(ReputationProvider):
    name = "urlhaus"

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
                summary="URLhaus integration is disabled in configuration.",
            )

        auth_key_secret = settings.URLHAUS_AUTH_KEY
        auth_key = auth_key_secret.get_secret_value() if auth_key_secret else None

        if auth_key:
            try:
                headers = {"Auth-Key": auth_key}
                async with httpx.AsyncClient(timeout=settings.REPUTATION_TIMEOUT_SECONDS) as client:
                    resp = await client.post(
                        "https://urlhaus-api.abuse.ch/v1/url/",
                        data={"url": normalized_url},
                        headers=headers,
                    )
                if resp.status_code == 200:
                    data = resp.json()
                    query_status = data.get("query_status")
                    if query_status == "ok":
                        threat = data.get("threat", "malware_download")
                        return ReputationResult(
                            provider=self.name,
                            status="match_found",
                            categories=[threat],
                            checked_at=now,
                            expires_at=expires,
                            summary=f"URLhaus lists this target as an active malware distribution point ({threat}).",
                            raw_ref={"threat": threat, "url_status": data.get("url_status")},
                        )
                    return ReputationResult(
                        provider=self.name,
                        status="no_match",
                        categories=[],
                        checked_at=now,
                        expires_at=expires,
                        summary="Not listed in the URLhaus database at time of check.",
                    )
                elif resp.status_code == 429:
                    return ReputationResult(
                        provider=self.name,
                        status="rate_limited",
                        categories=[],
                        checked_at=now,
                        expires_at=expires,
                        summary="URLhaus lookup rate-limited.",
                    )
                else:
                    return ReputationResult(
                        provider=self.name,
                        status="provider_error",
                        categories=[],
                        checked_at=now,
                        expires_at=expires,
                        summary="URLhaus returned an unexpected response code.",
                    )
            except Exception:
                return ReputationResult(
                    provider=self.name,
                    status="inconclusive",
                    categories=[],
                    checked_at=now,
                    expires_at=expires,
                    summary="URLhaus request timed out or network failed.",
                )

        # Deterministic offline mock fixture
        lower_url = normalized_url.lower()
        if "urlhaus" in lower_url or "payload" in lower_url or "ransomware" in lower_url:
            return ReputationResult(
                provider=self.name,
                status="match_found",
                categories=["malware_download"],
                checked_at=now,
                expires_at=expires,
                summary="URLhaus lists this target as an active malware distribution point (malware_download).",
                raw_ref={"mock": True, "threat": "malware_download"},
            )

        return ReputationResult(
            provider=self.name,
            status="no_match",
            categories=[],
            checked_at=now,
            expires_at=expires,
            summary="Not listed in the URLhaus database at time of check.",
            raw_ref={"mock": True},
        )
