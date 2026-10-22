"""Opaque, cursor-based pagination utilities.

Implements stable composite cursors (created_at, id) encoded as URL-safe base64 strings.
Guarantees determinism, tamper-resilience, and defense against off-by-one pagination issues.
"""

import base64
import json
from datetime import datetime
from typing import NamedTuple

from app.core.errors import ValidationError


class CursorData(NamedTuple):
    """Decoded composite cursor components."""

    created_at: str
    id: str


def encode_cursor(created_at: str, item_id: str) -> str:
    """Encode a created_at ISO string and UUID into an opaque base64 cursor."""
    payload = json.dumps({"c": created_at, "i": item_id}, separators=(",", ":"))
    return base64.urlsafe_b64encode(payload.encode("utf-8")).decode("utf-8")


def decode_cursor(cursor_str: str | None) -> CursorData | None:
    """Decode and validate an opaque pagination cursor.

    Raises ValidationError if cursor is tampered, non-base64, or invalid JSON.
    """
    if not cursor_str or not cursor_str.strip():
        return None

    try:
        raw_bytes = base64.urlsafe_b64decode(cursor_str.encode("utf-8"))
        data = json.loads(raw_bytes.decode("utf-8"))
    except Exception as exc:
        raise ValidationError(
            "Invalid pagination cursor encoding.",
            details=[{"field": "cursor", "issue": "cursor_malformed"}],
        ) from exc

    if not isinstance(data, dict) or "c" not in data or "i" not in data:
        raise ValidationError(
            "Invalid pagination cursor schema.",
            details=[{"field": "cursor", "issue": "cursor_invalid_structure"}],
        )

    created_at = str(data["c"])
    item_id = str(data["i"])

    # Validate ISO date format
    try:
        datetime.fromisoformat(created_at.replace("Z", "+00:00"))
    except Exception as exc:
        raise ValidationError(
            "Invalid timestamp within pagination cursor.",
            details=[{"field": "cursor", "issue": "cursor_timestamp_invalid"}],
        ) from exc

    if not item_id or len(item_id) > 64:
        raise ValidationError(
            "Invalid identifier within pagination cursor.",
            details=[{"field": "cursor", "issue": "cursor_id_invalid"}],
        )

    return CursorData(created_at=created_at, id=item_id)
