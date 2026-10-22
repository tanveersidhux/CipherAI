"""Scan repository interface and implementations."""

from abc import ABC, abstractmethod

from app.schemas.scan_history import ScanSummaryItem, StoredScanDetail
from app.schemas.threat_report import ThreatReport
from app.utils.pagination import CursorData


class ScanRepository(ABC):
    """Abstract interface for user scan persistence and querying."""

    @abstractmethod
    def save_scan(
        self,
        user_id: str,
        report: ThreatReport,
        client_request_id: str | None = None,
        title: str | None = None,
        is_pinned: bool = False,
        tags: list[str] | None = None,
        rescan_of_scan_id: str | None = None,
    ) -> str:
        """Persist a completed scan with evidence and explanation."""
        ...

    @abstractmethod
    def list_scans(
        self,
        user_id: str,
        limit: int = 20,
        cursor: CursorData | None = None,
        scan_type: str | None = None,
        risk_levels: list[str] | None = None,
        from_date: str | None = None,
        to_date: str | None = None,
        search: str | None = None,
        tag: str | None = None,
        pinned: bool | None = None,
    ) -> tuple[list[ScanSummaryItem], CursorData | None]:
        """List scans belonging to the user with filtering and pagination."""
        ...

    @abstractmethod
    def get_scan(self, user_id: str, scan_id: str) -> StoredScanDetail | None:
        """Fetch full scan report for user. Returns None if missing or not owned."""
        ...

    @abstractmethod
    def update_scan(
        self,
        user_id: str,
        scan_id: str,
        title: str | None = None,
        is_pinned: bool | None = None,
        tags: list[str] | None = None,
    ) -> ScanSummaryItem | None:
        """Update scan metadata. Returns None if not found or not owned."""
        ...

    @abstractmethod
    def delete_scan(self, user_id: str, scan_id: str) -> bool:
        """Delete scan. Returns True if deleted, False if not found."""
        ...
