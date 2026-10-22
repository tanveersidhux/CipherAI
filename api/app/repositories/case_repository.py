"""Case repository interface."""

from abc import ABC, abstractmethod

from app.schemas.cases import (
    CaseDetailResponse,
    CaseResponse,
    CaseScanAttachmentResponse,
)
from app.utils.pagination import CursorData


class CaseRepository(ABC):
    """Abstract interface for investigation cases, attachments, and audit timeline."""

    @abstractmethod
    def create_case(
        self,
        user_id: str,
        title: str,
        description: str | None = None,
        priority: str = "medium",
        scan_ids: list[str] | None = None,
    ) -> CaseResponse:
        """Create a new investigation case."""
        ...

    @abstractmethod
    def list_cases(
        self,
        user_id: str,
        status: str | None = None,
        limit: int = 20,
        cursor: CursorData | None = None,
    ) -> tuple[list[CaseResponse], CursorData | None]:
        """List cases belonging to the user."""
        ...

    @abstractmethod
    def get_case(self, user_id: str, case_id: str) -> CaseDetailResponse | None:
        """Fetch full case details with scans, notes, and timeline."""
        ...

    @abstractmethod
    def update_case(
        self,
        user_id: str,
        case_id: str,
        title: str | None = None,
        description: str | None = None,
        status: str | None = None,
        priority: str | None = None,
    ) -> CaseResponse | None:
        """Update case properties."""
        ...

    @abstractmethod
    def delete_case(self, user_id: str, case_id: str) -> bool:
        """Delete case (attached scans remain intact)."""
        ...

    @abstractmethod
    def attach_scan(
        self,
        user_id: str,
        case_id: str,
        scan_id: str,
    ) -> CaseScanAttachmentResponse:
        """Attach a user-owned scan to a user-owned case."""
        ...

    @abstractmethod
    def detach_scan(
        self,
        user_id: str,
        case_id: str,
        scan_id: str,
    ) -> bool:
        """Detach scan from case."""
        ...
