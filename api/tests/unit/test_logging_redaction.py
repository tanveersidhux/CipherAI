"""Unit tests for structured logging and secret redaction."""

import io
import json
import logging

from fastapi.testclient import TestClient

from app.core.logging import (
    JsonFormatter,
    SecretRedactionFilter,
    redact_sensitive_value,
)


def test_redact_sensitive_keys_and_values() -> None:
    """Verify keys like authorization, api_key, token are redacted."""
    sensitive_data = {
        "authorization": "Bearer secret_jwt_token_abcdef",
        "api_key": "sk-1234567890abcdef",
        "public_field": "safe_information",
        "nested": {
            "password": "my_super_secret_password",
            "token": "sensitive_session_token",
            "safe_counter": 42,
        },
    }

    cleaned = redact_sensitive_value("root", sensitive_data)

    assert cleaned["authorization"] == "[REDACTED]"
    assert cleaned["api_key"] == "[REDACTED]"
    assert cleaned["public_field"] == "safe_information"
    assert cleaned["nested"]["password"] == "[REDACTED]"
    assert cleaned["nested"]["token"] == "[REDACTED]"
    assert cleaned["nested"]["safe_counter"] == 42


def test_json_formatter_outputs_valid_json_and_redacts_extras() -> None:
    """Ensure JsonFormatter outputs valid single-line JSON and masks extra secret fields."""
    formatter = JsonFormatter()
    record = logging.LogRecord(
        name="test_logger",
        level=logging.INFO,
        pathname="test.py",
        lineno=10,
        msg="Processing transaction with token",
        args=(),
        exc_info=None,
    )
    # Inject sensitive extra fields
    record.__dict__["api_key"] = "my_secret_api_key_value"
    record.__dict__["authorization"] = "Bearer top_secret_jwt"
    record.__dict__["safe_detail"] = "all_clear"

    formatted = formatter.format(record)
    log_data = json.loads(formatted)

    assert log_data["level"] == "INFO"
    assert log_data["message"] == "Processing transaction with token"
    assert log_data["api_key"] == "[REDACTED]"
    assert log_data["authorization"] == "[REDACTED]"
    assert log_data["safe_detail"] == "all_clear"
    assert "my_secret_api_key_value" not in formatted
    assert "top_secret_jwt" not in formatted


def test_access_log_omits_query_string_and_body(client: TestClient) -> None:
    """Access log captures method, status, duration, but omits query strings and body content."""
    log_stream = io.StringIO()
    handler = logging.StreamHandler(log_stream)
    handler.setFormatter(JsonFormatter())
    handler.addFilter(SecretRedactionFilter())

    logger = logging.getLogger("cipher.access")
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)

    try:
        secret_query_val = "SECRET_QUERY_TOKEN_XYZ"
        # Make request with query string
        response = client.get(f"/api/v1/health?token={secret_query_val}")
        assert response.status_code == 200

        output = log_stream.getvalue()
        assert output != ""
        log_lines = [json.loads(line) for line in output.strip().split("\n") if line.strip()]
        access_entries = [entry for entry in log_lines if entry.get("logger") == "cipher.access"]

        assert len(access_entries) > 0
        last_entry = access_entries[-1]
        # Path must be exactly /api/v1/health without ?token=...
        assert last_entry["path"] == "/api/v1/health"
        assert secret_query_val not in output
        assert "duration_ms" in last_entry
        assert last_entry["status_code"] == 200
    finally:
        logger.removeHandler(handler)
