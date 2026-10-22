"""Unit tests for the in-memory bounded sliding window rate limiter."""

import pytest

from app.core.rate_limit import InMemoryRateLimiter


@pytest.mark.asyncio
async def test_rate_limiter_sliding_window_burst():
    fake_time = 1000.0

    def clock():
        return fake_time

    limiter = InMemoryRateLimiter(max_keys=10, clock=clock)

    # Allow up to 3 requests
    for i in range(3):
        allowed, limit, remaining, reset_secs = await limiter.check(
            "client-1", limit=3, window_seconds=60.0
        )
        assert allowed is True
        assert remaining == 2 - i

    # 4th request must be rejected
    allowed, limit, remaining, reset_secs = await limiter.check(
        "client-1", limit=3, window_seconds=60.0
    )
    assert allowed is False
    assert remaining == 0
    assert reset_secs == 60

    # Advance clock past window
    fake_time += 61.0
    allowed, limit, remaining, reset_secs = await limiter.check(
        "client-1", limit=3, window_seconds=60.0
    )
    assert allowed is True
    assert remaining == 2


@pytest.mark.asyncio
async def test_rate_limiter_memory_cap_eviction():
    limiter = InMemoryRateLimiter(max_keys=3)

    for i in range(5):
        await limiter.check(f"client-{i}", limit=10, window_seconds=60.0)

    # Store should have evicted oldest keys down to max_keys (3)
    assert len(limiter._store) == 3
    assert "client-0" not in limiter._store
    assert "client-1" not in limiter._store
    assert "client-4" in limiter._store
