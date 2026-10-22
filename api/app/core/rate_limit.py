"""In-memory, bounded sliding-window rate limiter dependency for scan endpoints."""

import asyncio
import time
from collections import OrderedDict
from collections.abc import Callable

from fastapi import Depends, Request, Response

from app.core.config import Settings, get_settings
from app.core.errors import RateLimitedError


class InMemoryRateLimiter:
    """Sliding-window rate limiter bounded to max_keys with LRU eviction."""

    def __init__(
        self,
        max_keys: int = 10000,
        clock: Callable[[], float] | None = None,
    ) -> None:
        self.max_keys = max_keys
        self._clock = clock or time.monotonic
        # Maps client_key -> list of timestamp floats
        self._store: OrderedDict[str, list[float]] = OrderedDict()
        self._lock = asyncio.Lock()

    def reset(self) -> None:
        """Clear all stored rate limit records (for testing)."""
        self._store.clear()

    async def check(
        self, key: str, limit: int, window_seconds: float = 60.0
    ) -> tuple[bool, int, int, int]:
        """Check and record request.

        Returns:
            (allowed, limit, remaining, reset_seconds)
        """
        async with self._lock:
            now = self._clock()
            window_start = now - window_seconds

            # Retrieve existing timestamps or initialize
            if key in self._store:
                timestamps = self._store[key]
                self._store.move_to_end(key)
            else:
                timestamps = []
                self._store[key] = timestamps

            # Evict entries older than window
            valid_timestamps = [t for t in timestamps if t > window_start]
            self._store[key] = valid_timestamps

            # Memory bound check: evict oldest keys if exceeding max_keys
            while len(self._store) > self.max_keys:
                self._store.popitem(last=False)

            current_count = len(valid_timestamps)

            if current_count >= limit:
                # Rate limit exceeded
                earliest = valid_timestamps[0]
                reset_seconds = max(1, int(window_seconds - (now - earliest)))
                return False, limit, 0, reset_seconds

            # Allow request and append timestamp
            valid_timestamps.append(now)
            remaining = max(0, limit - len(valid_timestamps))
            reset_seconds = int(window_seconds)
            return True, limit, remaining, reset_seconds


# Global singleton instance
rate_limiter = InMemoryRateLimiter()


def get_client_ip(request: Request, settings: Settings) -> str:
    """Extract client IP according to TRUST_PROXY_HEADERS configuration."""
    if settings.TRUST_PROXY_HEADERS:
        x_forwarded_for = request.headers.get("X-Forwarded-For")
        if x_forwarded_for:
            # Use right-most entry (appended by trusted proxy)
            parts = [p.strip() for p in x_forwarded_for.split(",") if p.strip()]
            if parts:
                return parts[-1]

    if request.client and request.client.host:
        return request.client.host
    return "127.0.0.1"


async def rate_limit_dependency(
    request: Request,
    response: Response,
    settings: Settings = Depends(get_settings),
) -> None:
    """FastAPI dependency enforcing rate limits and setting standard rate-limit headers."""
    client_ip = get_client_ip(request, settings)
    limit = settings.RATE_LIMIT_SCANS_PER_MINUTE

    allowed, limit_val, remaining, reset_secs = await rate_limiter.check(
        key=client_ip, limit=limit, window_seconds=60.0
    )

    # Attach standard rate limit headers to response
    response.headers["X-RateLimit-Limit"] = str(limit_val)
    response.headers["X-RateLimit-Remaining"] = str(remaining)
    response.headers["X-RateLimit-Reset"] = str(reset_secs)

    if not allowed:
        raise RateLimitedError(
            message=f"Rate limit exceeded: maximum {limit} scans per minute allowed.",
            retry_after=reset_secs,
        )
