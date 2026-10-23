"""Typed application configuration using pydantic-settings.

Follows CIPHER AI master architecture settings names, secret masking,
and defensive validation rules.
"""

import logging
from functools import lru_cache
from typing import Annotated, Literal
from urllib.parse import urlparse

from pydantic import Field, SecretStr, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger("cipher.config")


class Settings(BaseSettings):
    """Application settings with strict validation and secret masking."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Core Application
    APP_ENV: Literal["development", "test", "production"] = "development"
    APP_VERSION: str = "1.0.0"
    LOG_LEVEL: Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] = "INFO"

    # Cross-Origin Resource Sharing
    CORS_ALLOWED_ORIGINS: list[str] | str = Field(
        default_factory=lambda: ["http://localhost:5173", "http://127.0.0.1:5173"]
    )

    # Scanning & Payload Limits
    RATE_LIMIT_SCANS_PER_MINUTE: Annotated[int, Field(ge=1, le=1000)] = 30
    MAX_MESSAGE_CHARS: Annotated[int, Field(ge=100, le=100000)] = 5000
    MAX_URL_CHARS: Annotated[int, Field(ge=10, le=10000)] = 2048
    MAX_REQUEST_BODY_BYTES: Annotated[int, Field(ge=1024, le=10000000)] = 32768
    TRUST_PROXY_HEADERS: bool = False

    # API Documentation Control (ADR-0007)
    ENABLE_API_DOCS: bool | None = None

    # Database (Supabase) Configuration
    SUPABASE_URL: str | None = None
    SUPABASE_ANON_KEY: SecretStr | None = None
    SUPABASE_SERVICE_ROLE_KEY: SecretStr | None = None
    SUPABASE_JWT_SECRET: SecretStr | None = None
    DB_HEALTHCHECK_TIMEOUT_SECONDS: Annotated[float, Field(ge=0.1, le=30.0)] = 4.0
    SCAN_RETENTION_DAYS: Annotated[int, Field(ge=0, le=3650)] = 90

    # LLM & AI Intelligence Configuration
    LLM_ENABLED: bool = False
    AI_ENABLED: bool | None = None
    LLM_PROVIDER: str = "anthropic"
    LLM_API_KEY: SecretStr | None = None
    GEMINI_API_KEY: SecretStr | None = None
    LLM_MODEL: str = "claude-3-5-sonnet-20241022"
    LLM_BASE_URL: str | None = None
    LLM_TIMEOUT_SECONDS: Annotated[float, Field(ge=1.0, le=120.0)] = 12.0
    LLM_MAX_OUTPUT_TOKENS: Annotated[int, Field(ge=64, le=16384)] = 900
    AI_MAX_INPUT_CHARS: Annotated[int, Field(ge=100, le=50000)] = 4000
    AI_MAX_RETRIES: Annotated[int, Field(ge=0, le=5)] = 1
    AI_CIRCUIT_BREAKER_ENABLED: bool = False
    AI_CONCURRENCY_LIMIT: Annotated[int, Field(ge=1, le=20)] = 4

    # Phase 08 Feature Flags
    FEATURE_REPUTATION: bool = True
    FEATURE_EMAIL_ANALYSIS: bool = True
    FEATURE_BATCH: bool = True
    FEATURE_EXPORT: bool = True
    FEATURE_WATCHLISTS: bool = False
    FEATURE_NOTIFICATIONS: bool = False
    FEATURE_COLLABORATION: bool = False

    # External Threat Reputation Configuration
    GOOGLE_SAFE_BROWSING_API_KEY: SecretStr | None = None
    VIRUSTOTAL_API_KEY: SecretStr | None = None
    URLHAUS_AUTH_KEY: SecretStr | None = None
    REPUTATION_CACHE_TTL_SECONDS: Annotated[int, Field(ge=60, le=86400)] = 21600
    REPUTATION_TIMEOUT_SECONDS: Annotated[float, Field(ge=0.5, le=30.0)] = 4.0
    REPUTATION_MAX_SCORE_CONTRIBUTION: Annotated[int, Field(ge=10, le=80)] = 40

    # Batch Scanning Configuration
    BATCH_MAX_ITEMS: Annotated[int, Field(ge=1, le=100)] = 25
    BATCH_CONCURRENCY: Annotated[int, Field(ge=1, le=10)] = 3

    # Email Analysis Configuration
    EMAIL_MAX_BYTES: Annotated[int, Field(ge=1024, le=10485760)] = 1048576

    # Phase 11 Monitoring & Observability
    METRICS_ENABLED: bool = True
    METRICS_AUTH_TOKEN: SecretStr | None = None

    @field_validator("CORS_ALLOWED_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: str | list[str] | None) -> list[str]:
        """Parse comma-separated string or list to list of clean origins."""
        if value is None:
            return []
        if isinstance(value, str):
            value = value.strip()
            if not value:
                return []
            return [origin.strip().rstrip("/") for origin in value.split(",") if origin.strip()]
        return [str(origin).strip().rstrip("/") for origin in value if str(origin).strip()]

    @field_validator("SUPABASE_URL", mode="before")
    @classmethod
    def clean_supabase_url(cls, value: str | None) -> str | None:
        """Strip and normalize Supabase URL."""
        if value is None:
            return None
        cleaned = str(value).strip().rstrip("/")
        return cleaned or None

    @field_validator("LOG_LEVEL", mode="before")
    @classmethod
    def normalize_log_level(cls, value: str) -> str:
        """Normalize log level string to uppercase."""
        if isinstance(value, str):
            return value.strip().upper()
        return value

    @model_validator(mode="after")
    def validate_production_and_docs_rules(self) -> "Settings":
        """Validate production CORS constraints and resolve default API docs setting."""
        # Resolve default for ENABLE_API_DOCS if not explicitly provided
        if self.ENABLE_API_DOCS is None:
            self.ENABLE_API_DOCS = self.APP_ENV != "production"

        # Production security constraints
        if self.APP_ENV == "production":
            if not self.CORS_ALLOWED_ORIGINS:
                raise ValueError("CORS_ALLOWED_ORIGINS must not be empty in production.")

            for origin in self.CORS_ALLOWED_ORIGINS:
                if origin == "*":
                    raise ValueError(
                        "Wildcard '*' in CORS_ALLOWED_ORIGINS is strictly forbidden in production."
                    )
                parsed = urlparse(origin)
                if parsed.scheme != "https":
                    raise ValueError(
                        f"All CORS origins must use HTTPS in production. Disallowed: '{origin}'"
                    )
                if not parsed.netloc:
                    raise ValueError(f"Invalid CORS origin format in production: '{origin}'")

        # Sync AI_ENABLED and LLM_ENABLED
        if self.AI_ENABLED is not None:
            self.LLM_ENABLED = self.AI_ENABLED
        else:
            self.AI_ENABLED = self.LLM_ENABLED

        # Map GEMINI_API_KEY to LLM_API_KEY if not explicitly specified
        if self.GEMINI_API_KEY and not self.LLM_API_KEY:
            self.LLM_API_KEY = self.GEMINI_API_KEY
            if self.LLM_PROVIDER in ("anthropic", ""):
                self.LLM_PROVIDER = "gemini"
                if self.LLM_MODEL == "claude-3-5-sonnet-20241022":
                    self.LLM_MODEL = "gemini-3.5-flash"

        # LLM check: If LLM is enabled but no API key is set, warn instead of crashing
        if self.LLM_ENABLED and not self.LLM_API_KEY:
            logger.warning(
                "LLM_ENABLED is True but LLM_API_KEY is not configured; "
                "LLM features will report 'not_configured'."
            )

        return self

    @property
    def is_database_configured(self) -> bool:
        """Return True if both Supabase URL and service role key are present."""
        return bool(
            self.SUPABASE_URL
            and self.SUPABASE_SERVICE_ROLE_KEY
            and self.SUPABASE_SERVICE_ROLE_KEY.get_secret_value().strip()
        )

    @property
    def llm_status(self) -> Literal["enabled", "disabled", "not_configured"]:
        """Return computed status of LLM integration."""
        if not self.LLM_ENABLED:
            return "disabled"
        if not self.LLM_API_KEY or not self.LLM_API_KEY.get_secret_value().strip():
            return "not_configured"
        return "enabled"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return cached application settings instance."""
    return Settings()
