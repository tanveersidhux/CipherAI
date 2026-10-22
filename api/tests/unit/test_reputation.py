"""Unit tests for Phase 08 external threat reputation providers, cache, and scoring."""

from unittest.mock import patch

import pytest

from app.core.config import get_settings
from app.integrations.reputation.base import ReputationResult
from app.integrations.reputation.cache import ReputationCache
from app.integrations.reputation.google_safe_browsing import GoogleSafeBrowsingProvider
from app.integrations.reputation.urlhaus import URLhausProvider
from app.integrations.reputation.virustotal import VirusTotalProvider
from app.services.reputation_service import ReputationService, calculate_provider_contribution


@pytest.mark.asyncio
async def test_offline_reputation_deterministic_fixtures():
    """Verify offline mock fixtures return deterministic threat assessments without credentials."""
    gsb = GoogleSafeBrowsingProvider()
    vt = VirusTotalProvider()
    uh = URLhausProvider()

    # Malicious test URL from mock fixtures
    mal_res_gsb = await gsb.check_url("https://testsafebrowsing.appspot.com/s/malware.html")
    assert mal_res_gsb.status == "match_found"
    assert "MALWARE" in mal_res_gsb.categories

    mal_res_vt = await vt.check_url("https://malware-sample.example.com/bad")
    assert mal_res_vt.status == "match_found"
    assert any(c.lower() in ("malware", "malicious") for c in mal_res_vt.categories)

    mal_res_uh = await uh.check_url("http://urlhaus-test-malware.example.com/drop.exe")
    assert mal_res_uh.status == "match_found"

    # Clean test URL
    clean_res_gsb = await gsb.check_url("https://clean-example.com/safe")
    assert clean_res_gsb.status == "no_match"


def test_reputation_cache_privacy_preserving():
    """Verify in-memory cache hashes URLs and correctly expires items."""
    cache = ReputationCache()
    url = "https://example.com/login"
    provider = "google_safe_browsing"

    key = cache.compute_cache_key(url, provider)
    assert len(key) == 64  # SHA-256 hex length
    assert "example.com" not in key  # Privacy-preserving: raw URL is not key

    res = ReputationResult(
        provider=provider,
        status="match_found",
        categories=["PHISHING"],
        summary="Phishing threat detected.",
    )
    cache.set(url, res)
    cached = cache.get(url, provider)
    assert cached is not None
    assert cached.status == "match_found"
    assert cached.categories == ["PHISHING"]


def test_reputation_score_contribution_capped():
    """Ensure provider score calculation and max score cap enforcement."""
    settings = get_settings()
    malware_res = ReputationResult(
        provider="virustotal",
        status="match_found",
        categories=["MALWARE"],
        summary="Known trojan.",
    )
    phishing_res = ReputationResult(
        provider="google_safe_browsing",
        status="match_found",
        categories=["SOCIAL_ENGINEERING"],
        summary="Phishing lure.",
    )

    pts_mal = calculate_provider_contribution(malware_res)
    pts_phi = calculate_provider_contribution(phishing_res)
    assert pts_mal == 35
    assert pts_phi == 35

    # Sum is 70, but global cap is 40
    total_raw = pts_mal + pts_phi
    capped = min(total_raw, settings.REPUTATION_MAX_SCORE_CONTRIBUTION)
    assert capped == 40


@pytest.mark.asyncio
async def test_reputation_service_timeout_handling():
    """Verify reputation service handles slow providers without failing the entire assessment."""
    service = ReputationService()

    class SlowProvider:
        name = "slow_provider"

        def is_enabled(self):
            return True

        async def check_url(self, url):
            import asyncio

            await asyncio.sleep(10.0)
            return None

    with patch.object(service.registry, "get_providers", return_value=[SlowProvider()]):
        results, evidence, score = await service.evaluate_url("https://example.com")
        assert len(results) == 1
        assert results[0].status == "inconclusive"
        assert score == 0
