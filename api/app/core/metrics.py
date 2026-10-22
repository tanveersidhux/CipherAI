"""In-memory, bounded-cardinality metrics collector for CIPHER AI.

Provides high-performance, non-blocking telemetry for HTTP traffic, latency,
scan volume, AI/Gemini integration, external reputation feeds, and application errors.
"""

import re
import threading
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any

UUID_OR_ID_PATTERN = re.compile(
    r"[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}|\b\d+\b"
)


def normalize_metric_path(path: str) -> str:
    """Normalize dynamic URL segments to bounded template parameters.

    Example: /api/v1/cases/1ee12b5b-6c69-4322-a3ff-526626b46109/notes -> /api/v1/cases/{id}/notes
    """
    clean_path = path.split("?")[0].rstrip("/") or "/"
    return UUID_OR_ID_PATTERN.sub("{id}", clean_path)


@dataclass
class MetricsCollector:
    """Thread-safe telemetry store with zero external service dependencies."""

    started_at: datetime = field(default_factory=lambda: datetime.now(UTC))
    _lock: threading.Lock = field(default_factory=threading.Lock)

    # HTTP Metrics
    http_requests_total: dict[str, int] = field(default_factory=lambda: defaultdict(int))
    http_duration_total_ms: dict[str, float] = field(default_factory=lambda: defaultdict(float))
    http_duration_count: dict[str, int] = field(default_factory=lambda: defaultdict(int))

    # Scan Telemetry
    scans_by_type: dict[str, int] = field(default_factory=lambda: defaultdict(int))
    scans_by_risk: dict[str, int] = field(default_factory=lambda: defaultdict(int))

    # AI / Gemini Metrics
    gemini_calls_total: dict[str, int] = field(default_factory=lambda: defaultdict(int))
    gemini_duration_total_ms: float = 0.0
    gemini_duration_count: int = 0

    # External Threat Reputation Metrics
    reputation_lookups: dict[str, int] = field(default_factory=lambda: defaultdict(int))
    reputation_cache_hits: int = 0
    reputation_cache_misses: int = 0

    # Application Error Telemetry
    errors_by_code: dict[str, int] = field(default_factory=lambda: defaultdict(int))

    # Feedback Telemetry (Phase 11)
    feedback_counts: dict[str, int] = field(default_factory=lambda: defaultdict(int))

    def record_http_request(
        self, method: str, path: str, status_code: int, duration_ms: float
    ) -> None:
        """Record an incoming HTTP request with normalized path and status class."""
        norm_path = normalize_metric_path(path)
        status_class = f"{status_code // 100}xx"
        key = f"{method.upper()} {norm_path} {status_class}"

        with self._lock:
            self.http_requests_total[key] += 1
            self.http_duration_total_ms[norm_path] += duration_ms
            self.http_duration_count[norm_path] += 1

    def record_scan(self, scan_type: str, risk_level: str) -> None:
        """Record a completed scan by type and evaluated risk level."""
        clean_type = (scan_type or "unknown").lower()
        clean_risk = (risk_level or "unknown").upper()
        with self._lock:
            self.scans_by_type[clean_type] += 1
            self.scans_by_risk[clean_risk] += 1

    def record_gemini_call(self, status: str, duration_ms: float = 0.0) -> None:
        """Record an LLM/Gemini API execution outcome and duration."""
        clean_status = (status or "unknown").lower()
        with self._lock:
            self.gemini_calls_total[clean_status] += 1
            if duration_ms > 0:
                self.gemini_duration_total_ms += duration_ms
                self.gemini_duration_count += 1

    def record_reputation_lookup(self, provider: str, outcome: str) -> None:
        """Record external threat reputation query outcome."""
        clean_provider = (provider or "generic").lower()
        clean_outcome = (outcome or "unknown").lower()
        key = f"{clean_provider}:{clean_outcome}"
        with self._lock:
            self.reputation_lookups[key] += 1

    def record_reputation_cache(self, hit: bool) -> None:
        """Record reputation cache hit or miss."""
        with self._lock:
            if hit:
                self.reputation_cache_hits += 1
            else:
                self.reputation_cache_misses += 1

    def record_error(self, error_code: str) -> None:
        """Record application error occurrence by standard code."""
        clean_code = (error_code or "INTERNAL_ERROR").upper()
        with self._lock:
            self.errors_by_code[clean_code] += 1

    def record_feedback(self, feedback_type: str) -> None:
        """Record user/analyst scan feedback (e.g. false_positive, false_negative)."""
        clean_type = (feedback_type or "unknown").lower()
        with self._lock:
            self.feedback_counts[clean_type] += 1

    def get_snapshot(self) -> dict[str, Any]:
        """Generate structured metrics snapshot for monitoring endpoints and diagnostics."""
        with self._lock:
            now = datetime.now(UTC)
            uptime_seconds = round((now - self.started_at).total_seconds(), 2)
            total_requests = sum(self.http_requests_total.values())

            # Path latency averages
            endpoint_latencies = {}
            for path, count in self.http_duration_count.items():
                total_ms = self.http_duration_total_ms.get(path, 0.0)
                endpoint_latencies[path] = {
                    "requests": count,
                    "avg_ms": round(total_ms / count, 2) if count > 0 else 0.0,
                }

            # Gemini stats
            total_gemini = sum(self.gemini_calls_total.values())
            gemini_success = self.gemini_calls_total.get("success", 0)
            avg_gemini_ms = (
                round(self.gemini_duration_total_ms / self.gemini_duration_count, 2)
                if self.gemini_duration_count > 0
                else 0.0
            )

            # Reputation cache ratio
            total_cache_queries = self.reputation_cache_hits + self.reputation_cache_misses
            cache_hit_ratio = (
                round(self.reputation_cache_hits / total_cache_queries, 4)
                if total_cache_queries > 0
                else 0.0
            )

            return {
                "started_at": self.started_at.isoformat(),
                "uptime_seconds": uptime_seconds,
                "http": {
                    "total_requests": total_requests,
                    "requests_by_endpoint_and_status": dict(self.http_requests_total),
                    "latencies_by_endpoint": endpoint_latencies,
                },
                "scans": {
                    "total_scans": sum(self.scans_by_type.values()),
                    "scans_by_type": dict(self.scans_by_type),
                    "scans_by_risk": dict(self.scans_by_risk),
                    "feedback": dict(self.feedback_counts),
                },
                "ai": {
                    "total_requests": total_gemini,
                    "success_count": gemini_success,
                    "success_rate": round(gemini_success / total_gemini, 4)
                    if total_gemini > 0
                    else 1.0,
                    "avg_latency_ms": avg_gemini_ms,
                    "breakdown": dict(self.gemini_calls_total),
                },
                "reputation": {
                    "cache_hits": self.reputation_cache_hits,
                    "cache_misses": self.reputation_cache_misses,
                    "cache_hit_ratio": cache_hit_ratio,
                    "lookups_by_provider": dict(self.reputation_lookups),
                },
                "errors": {
                    "total_errors": sum(self.errors_by_code.values()),
                    "errors_by_code": dict(self.errors_by_code),
                },
            }

    def reset(self) -> None:
        """Reset all metrics (primarily for test isolation)."""
        with self._lock:
            self.started_at = datetime.now(UTC)
            self.http_requests_total.clear()
            self.http_duration_total_ms.clear()
            self.http_duration_count.clear()
            self.scans_by_type.clear()
            self.scans_by_risk.clear()
            self.gemini_calls_total.clear()
            self.gemini_duration_total_ms = 0.0
            self.gemini_duration_count = 0
            self.reputation_lookups.clear()
            self.reputation_cache_hits = 0
            self.reputation_cache_misses = 0
            self.errors_by_code.clear()
            self.feedback_counts.clear()


# Global singleton instance
metrics = MetricsCollector()
