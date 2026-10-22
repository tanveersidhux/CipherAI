"""Batch scanning service orchestrating bounded concurrency, deduplication, and item processing."""

import asyncio
import csv
import io
from urllib.parse import urlparse

from app.core.config import Settings
from app.repositories.batch_repository import BatchRepository
from app.repositories.scan_repository import ScanRepository
from app.schemas.batches import RejectedBatchItem
from app.schemas.scans import UrlScanRequest
from app.services.scan_service import scan_url


def parse_and_validate_batch_inputs(
    urls: list[str] | None, csv_text: str | None, max_items: int = 25
) -> tuple[list[str], list[RejectedBatchItem]]:
    """Validate and deduplicate URL inputs from raw list or CSV text."""
    raw_lines: list[str] = []

    if csv_text:
        reader = csv.reader(io.StringIO(csv_text))
        for row in reader:
            if not row:
                continue
            # Look for a url-like entry or use first column
            val = row[0].strip()
            if val.lower() == "url" or val.lower() == "target":
                continue  # Skip header
            raw_lines.append(val)
    elif urls:
        raw_lines = [u.strip() for u in urls if u and u.strip()]

    accepted: list[str] = []
    rejected: list[RejectedBatchItem] = []
    seen = set()

    for idx, raw_val in enumerate(raw_lines, start=1):
        if not raw_val:
            continue
        if len(raw_val) > 2048:
            rejected.append(
                RejectedBatchItem(
                    line=idx, value=raw_val[:50], reason="URL exceeds maximum 2048 characters."
                )
            )
            continue

        parsed = urlparse(raw_val)
        if parsed.scheme.lower() not in ("http", "https") or not parsed.netloc:
            rejected.append(
                RejectedBatchItem(
                    line=idx,
                    value=raw_val[:50],
                    reason="Invalid scheme or missing hostname. Must be http:// or https://",
                )
            )
            continue

        normalized = raw_val.strip()
        if normalized in seen:
            rejected.append(
                RejectedBatchItem(line=idx, value=raw_val[:50], reason="Duplicate entry in batch.")
            )
            continue

        if len(accepted) >= max_items:
            rejected.append(
                RejectedBatchItem(
                    line=idx,
                    value=raw_val[:50],
                    reason=f"Batch size limit exceeded (maximum {max_items} URLs).",
                )
            )
            continue

        seen.add(normalized)
        accepted.append(normalized)

    return accepted, rejected


class BatchService:
    def __init__(self) -> None:
        pass

    async def execute_batch_processing(
        self,
        user_id: str,
        batch_id: str,
        inputs: list[str],
        settings: Settings,
        batch_repo: BatchRepository,
        scan_repo: ScanRepository,
    ) -> None:
        """Process batch items concurrently with bounded semaphore."""
        sem = asyncio.Semaphore(settings.BATCH_CONCURRENCY)

        async def process_one(item_response) -> None:
            async with sem:
                item_id = item_response.id
                target_url = item_response.input
                try:
                    # Check if batch was cancelled
                    current_batch = batch_repo.get_batch(user_id=user_id, batch_id=batch_id)
                    if current_batch and current_batch.status == "cancelled":
                        return

                    batch_repo.update_item_status(
                        batch_id=batch_id, item_id=item_id, status="running"
                    )

                    # Deterministic scan
                    req = UrlScanRequest(url=target_url)
                    report = scan_url(req, settings=settings, request_id=f"batch_{item_id[:8]}")

                    # Persist scan
                    saved_scan_id = scan_repo.save_scan(
                        user_id=user_id,
                        report=report,
                        title=f"Batch item: {target_url[:80]}",
                        tags=["batch_scan"],
                    )

                    batch_repo.update_item_status(
                        batch_id=batch_id,
                        item_id=item_id,
                        status="completed",
                        scan_id=saved_scan_id,
                        risk_score=report.assessment.risk_score,
                        risk_level=report.assessment.risk_level,
                    )
                except Exception as exc:
                    batch_repo.update_item_status(
                        batch_id=batch_id,
                        item_id=item_id,
                        status="failed",
                        error=str(exc)[:255],
                    )

        # Retrieve items
        items, _ = batch_repo.list_batch_items(
            user_id=user_id, batch_id=batch_id, limit=len(inputs)
        )
        tasks = [process_one(it) for it in items]
        await asyncio.gather(*tasks, return_exceptions=True)


_batch_service = BatchService()


def get_batch_service() -> BatchService:
    return _batch_service
