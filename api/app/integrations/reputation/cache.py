"""Privacy-preserving reputation result caching using SHA-256 keys."""

import hashlib
from datetime import UTC, datetime

from app.integrations.reputation.base import ReputationResult


class ReputationCache:
    """Thread-safe in-memory cache keyed by SHA-256 hash of URL + provider."""

    def __init__(self) -> None:
        self._entries: dict[str, ReputationResult] = {}

    @staticmethod
    def compute_cache_key(normalized_url: str, provider: str) -> str:
        """Derive opaque SHA-256 digest without persisting raw target."""
        raw_key = f"{normalized_url.strip().lower()}:{provider.strip().lower()}"
        return hashlib.sha256(raw_key.encode("utf-8")).hexdigest()

    def get(self, normalized_url: str, provider: str) -> ReputationResult | None:
        """Retrieve non-expired reputation record from cache."""
        key = self.compute_cache_key(normalized_url, provider)
        cached = self._entries.get(key)
        if not cached:
            return None

        # Enforce expiration
        now = datetime.now(UTC)
        if cached.expires_at <= now:
            self._entries.pop(key, None)
            return None

        return cached

    def set(self, normalized_url: str, result: ReputationResult) -> None:
        """Store reputation result under hashed key."""
        key = self.compute_cache_key(normalized_url, result.provider)
        self._entries[key] = result

    def purge_expired(self) -> int:
        """Remove stale entries; returns count of evicted records."""
        now = datetime.now(UTC)
        stale_keys = [k for k, v in self._entries.items() if v.expires_at <= now]
        for k in stale_keys:
            self._entries.pop(k, None)
        return len(stale_keys)


# Global singleton instance
_reputation_cache = ReputationCache()


def get_reputation_cache() -> ReputationCache:
    return _reputation_cache
