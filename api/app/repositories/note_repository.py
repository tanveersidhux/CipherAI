"""Note repository interface."""

from abc import ABC, abstractmethod

from app.schemas.cases import CaseNoteResponse


class NoteRepository(ABC):
    """Abstract interface for investigation case notes."""

    @abstractmethod
    def add_note(self, user_id: str, case_id: str, body: str) -> CaseNoteResponse:
        """Add a timestamped plain-text note to a case."""
        ...

    @abstractmethod
    def update_note(
        self,
        user_id: str,
        case_id: str,
        note_id: str,
        body: str,
    ) -> CaseNoteResponse | None:
        """Update a note."""
        ...

    @abstractmethod
    def delete_note(self, user_id: str, case_id: str, note_id: str) -> bool:
        """Delete a note."""
        ...
