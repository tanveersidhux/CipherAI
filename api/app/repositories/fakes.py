"""High-fidelity in-memory fake repositories for tests and isolated local execution.

Implements all repository interfaces with strict user-scoping, cascade deletes,
composite cursor pagination, search, and aggregate dashboard calculations.
"""

import threading
import uuid
from collections import Counter
from datetime import UTC, datetime, timedelta

from app.core.errors import ConflictError, NotFoundError
from app.repositories.analytics_repository import AnalyticsRepository
from app.repositories.batch_repository import BatchRepository
from app.repositories.case_repository import CaseRepository
from app.repositories.note_repository import NoteRepository
from app.repositories.scan_repository import ScanRepository
from app.schemas.batches import BatchItemResponse, BatchStatusResponse
from app.schemas.cases import (
    CaseDetailResponse,
    CaseNoteResponse,
    CaseResponse,
    CaseScanAttachmentResponse,
    CaseTimelineItem,
)
from app.schemas.dashboard import (
    DashboardSummaryResponse,
    DashboardTotals,
    RiskDistributionItem,
    ScansOverTimeItem,
    TopIndicatorCategoryItem,
)
from app.schemas.scan_history import ScanSummaryItem, StoredScanDetail
from app.schemas.threat_report import ThreatReport
from app.utils.pagination import CursorData


class InMemoryStore:
    """Thread-safe state container for in-memory persistence."""

    def __init__(self) -> None:
        self.lock = threading.RLock()
        # scans: scan_id -> dict
        self.scans: dict[str, dict] = {}
        # cases: case_id -> dict
        self.cases: dict[str, dict] = {}
        # case_scans: (case_id, scan_id) -> dict
        self.case_scans: dict[tuple[str, str], dict] = {}
        # case_notes: note_id -> dict
        self.case_notes: dict[str, dict] = {}
        # case_events: list of dict
        self.case_events: list[dict] = []
        # user_settings: user_id -> dict
        self.user_settings: dict[str, dict] = {}
        # batch_jobs: batch_id -> dict
        self.batch_jobs: dict[str, dict] = {}
        # batch_items: item_id -> dict
        self.batch_items: dict[str, dict] = {}

    def clear(self) -> None:
        """Clear all stored data (used between test runs)."""
        with self.lock:
            self.scans.clear()
            self.cases.clear()
            self.case_scans.clear()
            self.case_notes.clear()
            self.case_events.clear()
            self.user_settings.clear()
            self.batch_jobs.clear()
            self.batch_items.clear()


# Global store instance
_global_store = InMemoryStore()


def get_in_memory_store() -> InMemoryStore:
    """Return the global in-memory store."""
    return _global_store


class FakeScanRepository(ScanRepository):
    """In-memory implementation of ScanRepository."""

    def __init__(self, store: InMemoryStore | None = None) -> None:
        self.store = store or _global_store

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
        with self.store.lock:
            # Check client_request_id idempotency
            if client_request_id:
                for s in self.store.scans.values():
                    if s["user_id"] == user_id and s.get("client_request_id") == client_request_id:
                        return s["id"]

            scan_id = report.report_id or str(uuid.uuid4())
            now_iso = datetime.now(UTC).isoformat()

            input_preview = report.input.display_value
            if len(input_preview) > 200:
                input_preview = input_preview[:197] + "..."

            display_title = title or report.input.display_value or "Scan Report"
            if len(display_title) > 120:
                display_title = display_title[:117] + "..."

            normalized_tags = [t.lower().strip() for t in (tags or []) if t.strip()]

            self.store.scans[scan_id] = {
                "id": scan_id,
                "user_id": user_id,
                "scan_type": report.scan_type,
                "title": display_title,
                "input_preview": input_preview,
                "normalized_input": report.input.normalized_value or report.input.display_value,
                "input_hash": report.input.input_hash,
                "risk_score": report.assessment.risk_score,
                "risk_level": report.assessment.risk_level,
                "engine_version": report.engine_version,
                "is_pinned": is_pinned,
                "tags": normalized_tags[:10],
                "client_request_id": client_request_id,
                "rescan_of_scan_id": rescan_of_scan_id,
                "created_at": report.created_at or now_iso,
                "updated_at": now_iso,
                "report": report.model_dump(),
            }
            return scan_id

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
        with self.store.lock:
            user_scans = [s for s in self.store.scans.values() if s["user_id"] == user_id]

            # Filters
            if scan_type and scan_type != "all":
                user_scans = [s for s in user_scans if s["scan_type"] == scan_type]

            if risk_levels:
                user_scans = [s for s in user_scans if s["risk_level"] in risk_levels]

            if from_date:
                user_scans = [s for s in user_scans if s["created_at"] >= from_date]

            if to_date:
                user_scans = [s for s in user_scans if s["created_at"] <= to_date]

            if tag:
                tag_lower = tag.lower().strip()
                user_scans = [s for s in user_scans if tag_lower in s.get("tags", [])]

            if pinned is not None:
                user_scans = [s for s in user_scans if s.get("is_pinned", False) is pinned]

            if search and search.strip():
                q = search.lower().strip()
                user_scans = [
                    s
                    for s in user_scans
                    if q in s["title"].lower()
                    or q in s["input_preview"].lower()
                    or q in s.get("normalized_input", "").lower()
                ]

            # Sort: newest first (created_at desc, id desc)
            user_scans.sort(key=lambda x: (x["created_at"], x["id"]), reverse=True)

            # Apply cursor
            if cursor:
                filtered: list[dict] = []
                for s in user_scans:
                    if (s["created_at"], s["id"]) < (cursor.created_at, cursor.id):
                        filtered.append(s)
                user_scans = filtered

            # Paginate
            items_slice = user_scans[:limit]
            next_cursor = None
            if len(user_scans) > limit and items_slice:
                last_item = items_slice[-1]
                next_cursor = CursorData(created_at=last_item["created_at"], id=last_item["id"])

            items = [
                ScanSummaryItem(
                    id=s["id"],
                    scan_type=s["scan_type"],
                    title=s["title"],
                    input_preview=s["input_preview"],
                    risk_score=s["risk_score"],
                    risk_level=s["risk_level"],
                    is_pinned=s.get("is_pinned", False),
                    tags=s.get("tags", []),
                    created_at=s["created_at"],
                )
                for s in items_slice
            ]
            return items, next_cursor

    def get_scan(self, user_id: str, scan_id: str) -> StoredScanDetail | None:
        with self.store.lock:
            s = self.store.scans.get(scan_id)
            if not s or s["user_id"] != user_id:
                return None

            report_dict = dict(s["report"])
            report_dict["scan_id"] = s["id"]
            report_dict["id"] = s["id"]
            report_dict["title"] = s["title"]
            report_dict["is_pinned"] = s.get("is_pinned", False)
            report_dict["tags"] = s.get("tags", [])
            report_dict["rescan_of_scan_id"] = s.get("rescan_of_scan_id")

            # Collect linked case_ids
            linked_cases = [
                case_id
                for (case_id, sc_id), rel in self.store.case_scans.items()
                if sc_id == scan_id and rel["user_id"] == user_id
            ]
            report_dict["case_ids"] = linked_cases

            return StoredScanDetail.model_validate(report_dict)

    def update_scan(
        self,
        user_id: str,
        scan_id: str,
        title: str | None = None,
        is_pinned: bool | None = None,
        tags: list[str] | None = None,
    ) -> ScanSummaryItem | None:
        with self.store.lock:
            s = self.store.scans.get(scan_id)
            if not s or s["user_id"] != user_id:
                return None

            if title is not None:
                s["title"] = title[:120]
            if is_pinned is not None:
                s["is_pinned"] = is_pinned
            if tags is not None:
                s["tags"] = [t.lower().strip() for t in tags if t.strip()][:10]

            s["updated_at"] = datetime.now(UTC).isoformat()

            return ScanSummaryItem(
                id=s["id"],
                scan_type=s["scan_type"],
                title=s["title"],
                input_preview=s["input_preview"],
                risk_score=s["risk_score"],
                risk_level=s["risk_level"],
                is_pinned=s["is_pinned"],
                tags=s["tags"],
                created_at=s["created_at"],
            )

    def delete_scan(self, user_id: str, scan_id: str) -> bool:
        with self.store.lock:
            s = self.store.scans.get(scan_id)
            if not s or s["user_id"] != user_id:
                return False

            del self.store.scans[scan_id]

            # Cascade: remove from case_scans
            to_del = [k for k in self.store.case_scans if k[1] == scan_id]
            for k in to_del:
                del self.store.case_scans[k]

            return True


class FakeCaseRepository(CaseRepository):
    """In-memory implementation of CaseRepository."""

    def __init__(self, store: InMemoryStore | None = None) -> None:
        self.store = store or _global_store

    def create_case(
        self,
        user_id: str,
        title: str,
        description: str | None = None,
        priority: str = "medium",
        scan_ids: list[str] | None = None,
    ) -> CaseResponse:
        with self.store.lock:
            # Verify all requested scan_ids belong to this user
            valid_scan_ids = []
            for sc_id in scan_ids or []:
                s = self.store.scans.get(sc_id)
                if not s or s["user_id"] != user_id:
                    raise NotFoundError(f"Scan '{sc_id}' not found or not owned by user.")
                valid_scan_ids.append(sc_id)

            case_id = str(uuid.uuid4())
            now_iso = datetime.now(UTC).isoformat()

            self.store.cases[case_id] = {
                "id": case_id,
                "user_id": user_id,
                "title": title[:120],
                "description": description[:2000] if description else None,
                "status": "open",
                "priority": priority,
                "created_at": now_iso,
                "updated_at": now_iso,
            }

            # Attach initial scans
            for sc_id in valid_scan_ids:
                self.store.case_scans[(case_id, sc_id)] = {
                    "case_id": case_id,
                    "scan_id": sc_id,
                    "user_id": user_id,
                    "attached_at": now_iso,
                }
                self.store.case_events.append(
                    {
                        "id": str(uuid.uuid4()),
                        "case_id": case_id,
                        "user_id": user_id,
                        "event_type": "scan_attached",
                        "reference_id": sc_id,
                        "metadata": {"title": self.store.scans[sc_id]["title"]},
                        "occurred_at": now_iso,
                    }
                )

            return CaseResponse(
                id=case_id,
                title=title[:120],
                description=description[:2000] if description else None,
                status="open",
                priority=priority,  # type: ignore[arg-type]
                scan_count=len(valid_scan_ids),
                created_at=now_iso,
                updated_at=now_iso,
            )

    def list_cases(
        self,
        user_id: str,
        status: str | None = None,
        limit: int = 20,
        cursor: CursorData | None = None,
    ) -> tuple[list[CaseResponse], CursorData | None]:
        with self.store.lock:
            user_cases = [c for c in self.store.cases.values() if c["user_id"] == user_id]

            if status and status != "all":
                user_cases = [c for c in user_cases if c["status"] == status]

            # Sort newest updated first
            user_cases.sort(key=lambda x: (x["updated_at"], x["id"]), reverse=True)

            if cursor:
                user_cases = [
                    c
                    for c in user_cases
                    if (c["updated_at"], c["id"]) < (cursor.created_at, cursor.id)
                ]

            items_slice = user_cases[:limit]
            next_cursor = None
            if len(user_cases) > limit and items_slice:
                last_item = items_slice[-1]
                next_cursor = CursorData(created_at=last_item["updated_at"], id=last_item["id"])

            items = []
            for c in items_slice:
                sc_count = sum(
                    1
                    for (c_id, _), rel in self.store.case_scans.items()
                    if c_id == c["id"] and rel["user_id"] == user_id
                )
                items.append(
                    CaseResponse(
                        id=c["id"],
                        title=c["title"],
                        description=c["description"],
                        status=c["status"],
                        priority=c["priority"],
                        scan_count=sc_count,
                        created_at=c["created_at"],
                        updated_at=c["updated_at"],
                    )
                )
            return items, next_cursor

    def get_case(self, user_id: str, case_id: str) -> CaseDetailResponse | None:
        with self.store.lock:
            c = self.store.cases.get(case_id)
            if not c or c["user_id"] != user_id:
                return None

            # Get attached scans
            attached_scan_ids = [
                sc_id
                for (cid, sc_id), rel in self.store.case_scans.items()
                if cid == case_id and rel["user_id"] == user_id
            ]

            scans: list[ScanSummaryItem] = []
            highest_risk_level = None
            risk_rank = {"low": 1, "medium": 2, "high": 3, "critical": 4, "inconclusive": 0}
            max_rank = -1

            for sc_id in attached_scan_ids:
                s = self.store.scans.get(sc_id)
                if s and s["user_id"] == user_id:
                    lvl = s["risk_level"]
                    if risk_rank.get(lvl, 0) > max_rank:
                        max_rank = risk_rank.get(lvl, 0)
                        highest_risk_level = lvl
                    scans.append(
                        ScanSummaryItem(
                            id=s["id"],
                            scan_type=s["scan_type"],
                            title=s["title"],
                            input_preview=s["input_preview"],
                            risk_score=s["risk_score"],
                            risk_level=s["risk_level"],
                            is_pinned=s.get("is_pinned", False),
                            tags=s.get("tags", []),
                            created_at=s["created_at"],
                        )
                    )

            # Get case notes
            notes = [
                CaseNoteResponse(
                    id=n["id"],
                    case_id=case_id,
                    body=n["body"],
                    created_at=n["created_at"],
                    updated_at=n["updated_at"],
                )
                for n in self.store.case_notes.values()
                if n["case_id"] == case_id and n["user_id"] == user_id
            ]
            notes.sort(key=lambda x: x.created_at)

            # Get timeline events
            timeline = [
                CaseTimelineItem(
                    type=e["event_type"],
                    occurred_at=e["occurred_at"],
                    reference_id=e.get("reference_id"),
                    summary=e["metadata"].get("summary", e["event_type"])
                    if e.get("metadata")
                    else e["event_type"],
                )
                for e in self.store.case_events
                if e["case_id"] == case_id and e["user_id"] == user_id
            ]
            timeline.sort(key=lambda x: x.occurred_at)

            return CaseDetailResponse(
                id=c["id"],
                title=c["title"],
                description=c["description"],
                status=c["status"],
                priority=c["priority"],
                scan_count=len(scans),
                created_at=c["created_at"],
                updated_at=c["updated_at"],
                scans=scans,
                notes=notes,
                highest_risk_level=highest_risk_level,
                timeline=timeline,
            )

    def update_case(
        self,
        user_id: str,
        case_id: str,
        title: str | None = None,
        description: str | None = None,
        status: str | None = None,
        priority: str | None = None,
    ) -> CaseResponse | None:
        with self.store.lock:
            c = self.store.cases.get(case_id)
            if not c or c["user_id"] != user_id:
                return None

            now_iso = datetime.now(UTC).isoformat()
            if status is not None and status != c["status"]:
                self.store.case_events.append(
                    {
                        "id": str(uuid.uuid4()),
                        "case_id": case_id,
                        "user_id": user_id,
                        "event_type": "status_changed",
                        "reference_id": None,
                        "metadata": {"summary": f"Status changed from {c['status']} to {status}"},
                        "occurred_at": now_iso,
                    }
                )
                c["status"] = status

            if title is not None:
                c["title"] = title[:120]
            if description is not None:
                c["description"] = description[:2000]
            if priority is not None:
                c["priority"] = priority

            c["updated_at"] = now_iso

            sc_count = sum(
                1
                for (cid, _), rel in self.store.case_scans.items()
                if cid == case_id and rel["user_id"] == user_id
            )

            return CaseResponse(
                id=c["id"],
                title=c["title"],
                description=c["description"],
                status=c["status"],
                priority=c["priority"],
                scan_count=sc_count,
                created_at=c["created_at"],
                updated_at=c["updated_at"],
            )

    def delete_case(self, user_id: str, case_id: str) -> bool:
        with self.store.lock:
            c = self.store.cases.get(case_id)
            if not c or c["user_id"] != user_id:
                return False

            del self.store.cases[case_id]

            # Cascade: delete notes and junction rows (scans remain intact!)
            notes_to_del = [
                nid for nid, n in self.store.case_notes.items() if n["case_id"] == case_id
            ]
            for nid in notes_to_del:
                del self.store.case_notes[nid]

            junctions_to_del = [k for k in self.store.case_scans if k[0] == case_id]
            for k in junctions_to_del:
                del self.store.case_scans[k]

            self.store.case_events = [e for e in self.store.case_events if e["case_id"] != case_id]
            return True

    def attach_scan(
        self,
        user_id: str,
        case_id: str,
        scan_id: str,
    ) -> CaseScanAttachmentResponse:
        with self.store.lock:
            c = self.store.cases.get(case_id)
            if not c or c["user_id"] != user_id:
                raise NotFoundError(f"Case '{case_id}' not found.")

            s = self.store.scans.get(scan_id)
            if not s or s["user_id"] != user_id:
                raise NotFoundError(f"Scan '{scan_id}' not found.")

            key = (case_id, scan_id)
            if key in self.store.case_scans:
                raise ConflictError(f"Scan '{scan_id}' is already attached to this case.")

            now_iso = datetime.now(UTC).isoformat()
            self.store.case_scans[key] = {
                "case_id": case_id,
                "scan_id": scan_id,
                "user_id": user_id,
                "attached_at": now_iso,
            }

            self.store.case_events.append(
                {
                    "id": str(uuid.uuid4()),
                    "case_id": case_id,
                    "user_id": user_id,
                    "event_type": "scan_attached",
                    "reference_id": scan_id,
                    "metadata": {"summary": f"Attached scan: {s['title']}"},
                    "occurred_at": now_iso,
                }
            )

            c["updated_at"] = now_iso

            return CaseScanAttachmentResponse(
                case_id=case_id,
                scan_id=scan_id,
                attached_at=now_iso,
            )

    def detach_scan(
        self,
        user_id: str,
        case_id: str,
        scan_id: str,
    ) -> bool:
        with self.store.lock:
            c = self.store.cases.get(case_id)
            if not c or c["user_id"] != user_id:
                return False

            key = (case_id, scan_id)
            if key not in self.store.case_scans:
                return False

            del self.store.case_scans[key]

            now_iso = datetime.now(UTC).isoformat()
            self.store.case_events.append(
                {
                    "id": str(uuid.uuid4()),
                    "case_id": case_id,
                    "user_id": user_id,
                    "event_type": "scan_detached",
                    "reference_id": scan_id,
                    "metadata": {"summary": f"Detached scan {scan_id}"},
                    "occurred_at": now_iso,
                }
            )
            c["updated_at"] = now_iso
            return True


class FakeNoteRepository(NoteRepository):
    """In-memory implementation of NoteRepository."""

    def __init__(self, store: InMemoryStore | None = None) -> None:
        self.store = store or _global_store

    def add_note(self, user_id: str, case_id: str, body: str) -> CaseNoteResponse:
        with self.store.lock:
            c = self.store.cases.get(case_id)
            if not c or c["user_id"] != user_id:
                raise NotFoundError(f"Case '{case_id}' not found.")

            note_id = str(uuid.uuid4())
            now_iso = datetime.now(UTC).isoformat()

            self.store.case_notes[note_id] = {
                "id": note_id,
                "case_id": case_id,
                "user_id": user_id,
                "body": body[:5000],
                "created_at": now_iso,
                "updated_at": now_iso,
            }

            self.store.case_events.append(
                {
                    "id": str(uuid.uuid4()),
                    "case_id": case_id,
                    "user_id": user_id,
                    "event_type": "note_added",
                    "reference_id": note_id,
                    "metadata": {"summary": f"Note added ({len(body)} characters)"},
                    "occurred_at": now_iso,
                }
            )

            c["updated_at"] = now_iso

            return CaseNoteResponse(
                id=note_id,
                case_id=case_id,
                body=body[:5000],
                created_at=now_iso,
                updated_at=now_iso,
            )

    def update_note(
        self,
        user_id: str,
        case_id: str,
        note_id: str,
        body: str,
    ) -> CaseNoteResponse | None:
        with self.store.lock:
            c = self.store.cases.get(case_id)
            if not c or c["user_id"] != user_id:
                return None

            n = self.store.case_notes.get(note_id)
            if not n or n["case_id"] != case_id or n["user_id"] != user_id:
                return None

            now_iso = datetime.now(UTC).isoformat()
            n["body"] = body[:5000]
            n["updated_at"] = now_iso
            c["updated_at"] = now_iso

            return CaseNoteResponse(
                id=note_id,
                case_id=case_id,
                body=n["body"],
                created_at=n["created_at"],
                updated_at=n["updated_at"],
            )

    def delete_note(self, user_id: str, case_id: str, note_id: str) -> bool:
        with self.store.lock:
            c = self.store.cases.get(case_id)
            if not c or c["user_id"] != user_id:
                return False

            n = self.store.case_notes.get(note_id)
            if not n or n["case_id"] != case_id or n["user_id"] != user_id:
                return False

            del self.store.case_notes[note_id]
            c["updated_at"] = datetime.now(UTC).isoformat()
            return True


class FakeAnalyticsRepository(AnalyticsRepository):
    """In-memory implementation of AnalyticsRepository."""

    def __init__(self, store: InMemoryStore | None = None) -> None:
        self.store = store or _global_store

    def get_dashboard_summary(
        self,
        user_id: str,
        range_days: int = 30,
    ) -> DashboardSummaryResponse:
        with self.store.lock:
            user_scans = [s for s in self.store.scans.values() if s["user_id"] == user_id]
            user_cases = [c for c in self.store.cases.values() if c["user_id"] == user_id]

            now = datetime.now(UTC)
            seven_days_ago = (now - timedelta(days=7)).isoformat()
            range_cutoff = (now - timedelta(days=range_days)).isoformat()

            # Totals
            total_scans = len(user_scans)
            scans_last_7 = sum(1 for s in user_scans if s["created_at"] >= seven_days_ago)
            high_crit = sum(1 for s in user_scans if s["risk_level"] in ("high", "critical"))
            inconclusive = sum(1 for s in user_scans if s["risk_level"] == "inconclusive")
            open_cases = sum(1 for c in user_cases if c["status"] in ("open", "in_progress"))

            totals = DashboardTotals(
                total_scans=total_scans,
                scans_last_7_days=scans_last_7,
                high_or_critical_scans=high_crit,
                inconclusive_scans=inconclusive,
                open_cases=open_cases,
            )

            # Risk Distribution (within range)
            range_scans = [s for s in user_scans if s["created_at"] >= range_cutoff]
            dist_counter = Counter(s["risk_level"] for s in range_scans)
            standard_levels = ["critical", "high", "medium", "low", "inconclusive"]
            risk_dist = [
                RiskDistributionItem(risk_level=lvl, count=dist_counter.get(lvl, 0))
                for lvl in standard_levels
            ]

            # Scans over time (by date in range)
            time_series_map: dict[str, dict[str, int]] = {}
            for s in range_scans:
                d_str = s["created_at"][:10]  # YYYY-MM-DD
                entry = time_series_map.setdefault(d_str, {"count": 0, "high_or_critical": 0})
                entry["count"] += 1
                if s["risk_level"] in ("high", "critical"):
                    entry["high_or_critical"] += 1

            scans_over_time = [
                ScansOverTimeItem(date=d, count=v["count"], high_or_critical=v["high_or_critical"])
                for d, v in sorted(time_series_map.items())
            ]

            # Top indicator categories
            category_counter: Counter[str] = Counter()
            for s in range_scans:
                report = s.get("report")
                if report and isinstance(report, dict):
                    for ind in report.get("indicators", []):
                        if ind.get("triggered", True):
                            cat = ind.get("category", "GENERAL")
                            category_counter[cat] += 1

            top_indicators = [
                TopIndicatorCategoryItem(category=cat, count=cnt)
                for cat, cnt in category_counter.most_common(10)
            ]

            # Recent scans (up to 5, sorted newest first)
            recent_sorted = sorted(user_scans, key=lambda x: x["created_at"], reverse=True)[:5]
            recent_scans = [
                ScanSummaryItem(
                    id=s["id"],
                    scan_type=s["scan_type"],
                    title=s["title"],
                    input_preview=s["input_preview"],
                    risk_score=s["risk_score"],
                    risk_level=s["risk_level"],
                    is_pinned=s.get("is_pinned", False),
                    tags=s.get("tags", []),
                    created_at=s["created_at"],
                )
                for s in recent_sorted
            ]

            return DashboardSummaryResponse(
                totals=totals,
                risk_distribution=risk_dist,
                scans_over_time=scans_over_time,
                top_indicator_categories=top_indicators,
                recent_scans=recent_scans,
                generated_at=now.isoformat(),
            )


class FakeBatchRepository(BatchRepository):
    """In-memory implementation of BatchRepository."""

    def __init__(self, store: InMemoryStore | None = None) -> None:
        self.store = store or _global_store

    def create_batch(self, user_id: str, name: str, inputs: list[str]) -> str:
        with self.store.lock:
            batch_id = str(uuid.uuid4())
            now_iso = datetime.now(UTC).isoformat()
            self.store.batch_jobs[batch_id] = {
                "id": batch_id,
                "user_id": user_id,
                "name": name or "Batch Scan",
                "status": "queued",
                "total": len(inputs),
                "completed": 0,
                "failed": 0,
                "created_at": now_iso,
                "started_at": None,
                "finished_at": None,
                "updated_at": now_iso,
            }
            for pos, inp in enumerate(inputs):
                item_id = str(uuid.uuid4())
                self.store.batch_items[item_id] = {
                    "id": item_id,
                    "batch_id": batch_id,
                    "user_id": user_id,
                    "position": pos,
                    "input": inp,
                    "status": "pending",
                    "scan_id": None,
                    "risk_score": None,
                    "risk_level": None,
                    "error": None,
                    "created_at": now_iso,
                    "updated_at": now_iso,
                }
            return batch_id

    def get_batch(self, user_id: str, batch_id: str) -> BatchStatusResponse | None:
        with self.store.lock:
            job = self.store.batch_jobs.get(batch_id)
            if not job or job["user_id"] != user_id:
                return None
            items = [it for it in self.store.batch_items.values() if it["batch_id"] == batch_id]
            risk_counts: dict[str, int] = {}
            for it in items:
                lvl = it.get("risk_level")
                if lvl:
                    risk_counts[lvl] = risk_counts.get(lvl, 0) + 1
            return BatchStatusResponse(
                id=job["id"],
                status=job["status"],
                total=job["total"],
                completed=job["completed"],
                failed=job["failed"],
                summary_by_risk_level=risk_counts,
                created_at=job["created_at"],
                finished_at=job.get("finished_at"),
            )

    def list_batch_items(
        self, user_id: str, batch_id: str, limit: int = 50, cursor: str | None = None
    ) -> tuple[list[BatchItemResponse], str | None]:
        with self.store.lock:
            job = self.store.batch_jobs.get(batch_id)
            if not job or job["user_id"] != user_id:
                return [], None
            items = [it for it in self.store.batch_items.values() if it["batch_id"] == batch_id]
            items.sort(key=lambda x: x["position"])
            paged = items[:limit]
            result = [
                BatchItemResponse(
                    id=it["id"],
                    input=it["input"],
                    status=it["status"],
                    scan_id=it.get("scan_id"),
                    risk_score=it.get("risk_score"),
                    risk_level=it.get("risk_level"),
                    error=it.get("error"),
                )
                for it in paged
            ]
            return result, None

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
        with self.store.lock:
            it = self.store.batch_items.get(item_id)
            if not it:
                return
            it["status"] = status
            if scan_id:
                it["scan_id"] = scan_id
            if risk_score is not None:
                it["risk_score"] = risk_score
            if risk_level:
                it["risk_level"] = risk_level
            if error:
                it["error"] = error
            it["updated_at"] = datetime.now(UTC).isoformat()

            job = self.store.batch_jobs.get(batch_id)
            if job:
                items = [x for x in self.store.batch_items.values() if x["batch_id"] == batch_id]
                completed_count = sum(1 for x in items if x["status"] == "completed")
                failed_count = sum(1 for x in items if x["status"] == "failed")
                job["completed"] = completed_count
                job["failed"] = failed_count
                if completed_count + failed_count >= job["total"]:
                    job["status"] = "completed"
                    job["finished_at"] = datetime.now(UTC).isoformat()
                elif job["status"] == "queued":
                    job["status"] = "running"
                    job["started_at"] = datetime.now(UTC).isoformat()

    def set_batch_status(
        self, user_id: str, batch_id: str, status: str
    ) -> BatchStatusResponse | None:
        with self.store.lock:
            job = self.store.batch_jobs.get(batch_id)
            if not job or job["user_id"] != user_id:
                return None
            job["status"] = status
            job["updated_at"] = datetime.now(UTC).isoformat()
            if status in ("completed", "cancelled", "failed"):
                job["finished_at"] = datetime.now(UTC).isoformat()
            return self.get_batch(user_id, batch_id)
