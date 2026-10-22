"""Unit tests for composite cursor pagination encode/decode and validation."""

import pytest

from app.core.errors import ValidationError
from app.utils.pagination import decode_cursor, encode_cursor


def test_cursor_round_trip() -> None:
    created_at = "2026-10-23T12:00:00+00:00"
    item_id = "550e8400-e29b-41d4-a716-446655440000"

    encoded = encode_cursor(created_at, item_id)
    assert isinstance(encoded, str)

    decoded = decode_cursor(encoded)
    assert decoded is not None
    assert decoded.created_at == created_at
    assert decoded.id == item_id


def test_cursor_none_or_empty_returns_none() -> None:
    assert decode_cursor(None) is None
    assert decode_cursor("") is None
    assert decode_cursor("   ") is None


def test_cursor_tampered_base64_raises_validation_error() -> None:
    with pytest.raises(ValidationError, match="cursor"):
        decode_cursor("%%%NOT_BASE_64%%%")


def test_cursor_invalid_json_raises_validation_error() -> None:
    import base64

    bad_bytes = base64.urlsafe_b64encode(b"not-a-json-object").decode("utf-8")
    with pytest.raises(ValidationError, match="cursor"):
        decode_cursor(bad_bytes)


def test_cursor_invalid_timestamp_raises_validation_error() -> None:
    import base64
    import json

    payload = base64.urlsafe_b64encode(
        json.dumps({"c": "not-a-date", "i": "uuid"}).encode("utf-8")
    ).decode("utf-8")
    with pytest.raises(ValidationError, match="timestamp"):
        decode_cursor(payload)
