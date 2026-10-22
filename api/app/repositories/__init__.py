"""Repository factories and dependency providers."""

from functools import lru_cache

from app.repositories.analytics_repository import AnalyticsRepository
from app.repositories.batch_repository import BatchRepository
from app.repositories.case_repository import CaseRepository
from app.repositories.fakes import (
    FakeAnalyticsRepository,
    FakeBatchRepository,
    FakeCaseRepository,
    FakeNoteRepository,
    FakeScanRepository,
    get_in_memory_store,
)
from app.repositories.note_repository import NoteRepository
from app.repositories.scan_repository import ScanRepository


@lru_cache(maxsize=1)
def get_scan_repository() -> ScanRepository:
    """Return configured ScanRepository instance."""
    return FakeScanRepository(get_in_memory_store())


@lru_cache(maxsize=1)
def get_case_repository() -> CaseRepository:
    """Return configured CaseRepository instance."""
    return FakeCaseRepository(get_in_memory_store())


@lru_cache(maxsize=1)
def get_note_repository() -> NoteRepository:
    """Return configured NoteRepository instance."""
    return FakeNoteRepository(get_in_memory_store())


@lru_cache(maxsize=1)
def get_analytics_repository() -> AnalyticsRepository:
    """Return configured AnalyticsRepository instance."""
    return FakeAnalyticsRepository(get_in_memory_store())


@lru_cache(maxsize=1)
def get_batch_repository() -> BatchRepository:
    """Return configured BatchRepository instance."""
    return FakeBatchRepository(get_in_memory_store())
