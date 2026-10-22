"""Unit tests for typed configuration loading, validation, and secret masking."""

import pytest
from pydantic import SecretStr, ValidationError

from app.core.config import Settings


def test_development_defaults() -> None:
    """Verify default configuration values in development mode."""
    settings = Settings(APP_ENV="development")
    assert settings.APP_ENV == "development"
    assert settings.APP_VERSION == "1.0.0"
    assert settings.LOG_LEVEL == "INFO"
    assert "http://localhost:5173" in settings.CORS_ALLOWED_ORIGINS
    assert settings.ENABLE_API_DOCS is True
    assert settings.RATE_LIMIT_SCANS_PER_MINUTE == 30
    assert settings.MAX_MESSAGE_CHARS == 5000
    assert settings.MAX_URL_CHARS == 2048
    assert settings.MAX_REQUEST_BODY_BYTES == 20000
    assert settings.LLM_ENABLED is False
    assert settings.llm_status == "disabled"
    assert settings.is_database_configured is False


def test_cors_origin_parsing_and_trimming() -> None:
    """Verify comma-separated origins parse, strip whitespace, and normalize trailing slashes."""
    settings = Settings(
        APP_ENV="development",
        CORS_ALLOWED_ORIGINS="http://localhost:5173/ , https://cipher.internal/ , http://127.0.0.1:3000",  # type: ignore[arg-type]
    )
    assert settings.CORS_ALLOWED_ORIGINS == [
        "http://localhost:5173",
        "https://cipher.internal",
        "http://127.0.0.1:3000",
    ]


def test_production_rejects_empty_cors() -> None:
    """Production mode must reject empty CORS allowlist."""
    with pytest.raises(ValidationError, match="CORS_ALLOWED_ORIGINS must not be empty"):
        Settings(
            APP_ENV="production",
            CORS_ALLOWED_ORIGINS="",  # type: ignore[arg-type]
        )


def test_production_rejects_wildcard_cors() -> None:
    """Production mode must reject wildcard CORS origin."""
    with pytest.raises(
        ValidationError, match=r"Wildcard '\*' in CORS_ALLOWED_ORIGINS is strictly forbidden"
    ):
        Settings(
            APP_ENV="production",
            CORS_ALLOWED_ORIGINS="*",  # type: ignore[arg-type]
        )


def test_production_rejects_non_https_cors() -> None:
    """Production mode must reject HTTP (non-secure) origins."""
    with pytest.raises(ValidationError, match="All CORS origins must use HTTPS in production"):
        Settings(
            APP_ENV="production",
            CORS_ALLOWED_ORIGINS="https://app.cipher-ai.com,http://insecure.cipher-ai.com",  # type: ignore[arg-type]
        )


def test_production_accepts_valid_https_cors() -> None:
    """Production mode accepts valid HTTPS origins and defaults docs to disabled."""
    settings = Settings(
        APP_ENV="production",
        CORS_ALLOWED_ORIGINS="https://app.cipher-ai.com, https://admin.cipher-ai.com",  # type: ignore[arg-type]
    )
    assert settings.ENABLE_API_DOCS is False
    assert len(settings.CORS_ALLOWED_ORIGINS) == 2


def test_llm_status_states() -> None:
    """Verify computed status when LLM is disabled, missing key, or fully configured."""
    # Disabled
    s_disabled = Settings(LLM_ENABLED=False)
    assert s_disabled.llm_status == "disabled"

    # Enabled without key -> does not crash, yields not_configured
    s_not_config = Settings(LLM_ENABLED=True, LLM_API_KEY=None)
    assert s_not_config.llm_status == "not_configured"

    # Enabled with key
    s_enabled = Settings(
        LLM_ENABLED=True,
        LLM_API_KEY=SecretStr("super-secret-key-12345"),
    )
    assert s_enabled.llm_status == "enabled"


def test_secret_masking() -> None:
    """Secrets must never be exposed via str() or repr()."""
    secret_val = "super-confidential-service-role-key-999"
    settings = Settings(
        SUPABASE_SERVICE_ROLE_KEY=SecretStr(secret_val),
        LLM_API_KEY=SecretStr("secret-llm-token"),
    )

    repr_str = repr(settings)
    plain_str = str(settings)

    assert secret_val not in repr_str
    assert secret_val not in plain_str
    assert "secret-llm-token" not in repr_str
    assert "secret-llm-token" not in plain_str
    assert "**********" in repr_str or "SecretStr('**********')" in repr_str


def test_numeric_bounds_validation() -> None:
    """Out-of-bounds numeric parameters must fail fast."""
    # Negative rate limit
    with pytest.raises(ValidationError):
        Settings(RATE_LIMIT_SCANS_PER_MINUTE=0)

    # Excessive rate limit
    with pytest.raises(ValidationError):
        Settings(RATE_LIMIT_SCANS_PER_MINUTE=5000)

    # Max URL chars too low
    with pytest.raises(ValidationError):
        Settings(MAX_URL_CHARS=5)

    # Body bytes too small
    with pytest.raises(ValidationError):
        Settings(MAX_REQUEST_BODY_BYTES=500)
