"""Unit and regression tests for SSRF protections and private/reserved IP identification."""

import pytest

from app.engine.url_validation import (
    is_ssrf_host,
    parse_and_validate_url,
)
from app.integrations.reputation.base import ReputationProvider, ReputationResult
from app.services.reputation_service import ReputationService


@pytest.mark.parametrize(
    "url, expected_normalized_host, is_private",
    [
        # Standard Loopback
        ("http://127.0.0.1/test", "127.0.0.1", True),
        ("http://127.0.0.2/test", "127.0.0.2", True),
        ("http://0.0.0.0/", "0.0.0.0", True),
        # 2-part and 3-part shorthand notations
        ("http://127.1/", "127.0.0.1", True),
        ("http://127.0.1/", "127.0.0.1", True),
        # Hexadecimal IPv4 single-dword and dotted
        ("http://0x7f000001/", "127.0.0.1", True),
        ("http://0x7f.0.0.1/", "127.0.0.1", True),
        ("http://0x7f.0x0.0x0.0x1/", "127.0.0.1", True),
        # Octal IPv4
        ("http://017700000001/", "127.0.0.1", True),
        ("http://0177.0.0.1/", "127.0.0.1", True),
        ("http://0177.0.0.01/", "127.0.0.1", True),
        # Decimal (dword) integer IPv4
        ("http://2130706433/", "127.0.0.1", True),
        ("http://3232235521/", "192.168.0.1", True),
        ("http://2852039166/", "169.254.169.254", True),
        # RFC 1918 Private Ranges
        ("http://10.0.0.1/secret", "10.0.0.1", True),
        ("http://10.255.255.254/", "10.255.255.254", True),
        ("http://172.16.0.1/", "172.16.0.1", True),
        ("http://172.31.255.255/", "172.31.255.255", True),
        ("http://192.168.1.1/admin", "192.168.1.1", True),
        ("http://192.168.254.254/", "192.168.254.254", True),
        # Cloud Metadata and Link-Local
        ("http://169.254.169.254/latest/meta-data/", "169.254.169.254", True),
        ("http://169.254.170.2/v2/metadata", "169.254.170.2", True),
        # IPv6 Loopback and Link-Local
        ("http://[::1]/status", "[::1]", True),
        ("http://[fe80::1]/", "[fe80::1]", True),
        # IPv4-mapped IPv6
        ("http://[::ffff:127.0.0.1]/", "[::ffff:127.0.0.1]", True),
        ("http://[::ffff:169.254.169.254]/", "[::ffff:169.254.169.254]", True),
        ("http://[::ffff:10.0.0.1]/", "[::ffff:10.0.0.1]", True),
        # Public non-reserved IPs (Should NOT be private)
        ("http://8.8.8.8/dns", "8.8.8.8", False),
        ("http://1.1.1.1/", "1.1.1.1", False),
        ("http://93.184.216.34/", "93.184.216.34", False),
    ],
)
def test_ssrf_ip_variations_classification(
    url: str, expected_normalized_host: str, is_private: bool
):
    parsed = parse_and_validate_url(url)
    assert parsed.host == expected_normalized_host.lower()
    assert parsed.is_private_ip is is_private
    if is_private:
        assert is_ssrf_host(parsed.host) is True


@pytest.mark.parametrize(
    "host, is_ssrf",
    [
        ("localhost", True),
        ("service.localhost", True),
        ("api.local", True),
        ("vault.internal", True),
        ("dc01.corp", True),
        ("nas.lan", True),
        ("metadata.google.internal", True),
        ("instance-data", True),
        ("router.home", True),
        ("example.com", False),
        ("safe-browsing.googleapis.com", False),
        ("virustotal.com", False),
        ("urlhaus-api.abuse.ch", False),
    ],
)
def test_ssrf_hostname_classification(host: str, is_ssrf: bool):
    assert is_ssrf_host(host) is is_ssrf


@pytest.mark.asyncio
async def test_reputation_service_bypasses_ssrf_and_private_targets(monkeypatch):
    """Assert ReputationService never dispatches requests for internal or private targets."""
    called_targets = []

    class DummySpyProvider(ReputationProvider):
        name = "spy_provider"

        async def check_url(self, target_url: str) -> ReputationResult:
            called_targets.append(target_url)
            return ReputationResult(
                provider=self.name,
                status="match_found",
                categories=["MALWARE"],
                summary="Should not be called",
            )

    service = ReputationService()
    monkeypatch.setattr(service.registry, "get_providers", lambda: [DummySpyProvider()])

    # Test SSRF targets
    ssrf_targets = [
        "http://127.0.0.1:8000/api",
        "http://169.254.169.254/latest/meta-data/",
        "http://[::1]/metrics",
        "http://0x7f000001/admin",
        "http://2130706433/",
        "http://metadata.google.internal/computeMetadata/v1/",
        "http://internal.vault.local/",
    ]

    for target in ssrf_targets:
        results, evidence, score = await service.evaluate_url(target)
        assert results == []
        assert evidence == []
        assert score == 0

    # Verify zero outbound requests were issued
    assert len(called_targets) == 0
