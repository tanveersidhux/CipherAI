"""Provider registry managing active reputation adapters."""

from app.integrations.reputation.base import ReputationProvider
from app.integrations.reputation.google_safe_browsing import GoogleSafeBrowsingProvider
from app.integrations.reputation.urlhaus import URLhausProvider
from app.integrations.reputation.virustotal import VirusTotalProvider


class ReputationRegistry:
    def __init__(self) -> None:
        self._providers: list[ReputationProvider] = [
            GoogleSafeBrowsingProvider(),
            VirusTotalProvider(),
            URLhausProvider(),
        ]

    def get_providers(self) -> list[ReputationProvider]:
        return [p for p in self._providers if p.is_enabled()]

    def get_provider(self, name: str) -> ReputationProvider | None:
        for p in self._providers:
            if p.name == name:
                return p
        return None


_registry = ReputationRegistry()


def get_reputation_registry() -> ReputationRegistry:
    return _registry
