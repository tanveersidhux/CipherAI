"""Repository interface for batch scanning jobs and items."""

from abc import ABC, abstractmethod

from app.schemas.batches import BatchItemResponse, BatchStatusResponse


class BatchRepository(ABC):
    @abstractmethod
    def create_batch(self, user_id: str, name: str, inputs: list[str]) -> str:
        """Create batch job and its pending items; returns batch_id."""
        pass

    @abstractmethod
    def get_batch(self, user_id: str, batch_id: str) -> BatchStatusResponse | None:
        """Retrieve batch status and aggregate counts."""
        pass

    @abstractmethod
    def list_batch_items(
        self, user_id: str, batch_id: str, limit: int = 50, cursor: str | None = None
    ) -> tuple[list[BatchItemResponse], str | None]:
        """List items belonging to a batch."""
        pass

    @abstractmethod
    def update_item_status(
        self,
        batch_id: str,
        item_id: str,
        status: str,
        scan_id: str | None = None,
        risk_score: int | None = None,
        risk_level: str | None = None,
        error: str | None = None,
    ) -> None:
        """Update individual batch item status."""
        pass

    @abstractmethod
    def set_batch_status(
        self, user_id: str, batch_id: str, status: str
    ) -> BatchStatusResponse | None:
        """Update overall batch status."""
        pass
