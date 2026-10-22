"""Feature flag utilities and definitions for CIPHER AI."""

from app.core.config import get_settings


def is_feature_enabled(feature_name: str) -> bool:
    """Check if a named feature is enabled in application settings."""
    settings = get_settings()
    feature_attr = f"FEATURE_{feature_name.upper()}"
    return bool(getattr(settings, feature_attr, False))


def get_feature_flags_status() -> dict[str, object]:
    """Return dictionary of all feature flags and active providers."""
    settings = get_settings()
    return {
        "reputation": settings.FEATURE_REPUTATION,
        "email_analysis": settings.FEATURE_EMAIL_ANALYSIS,
        "batch": settings.FEATURE_BATCH,
        "export": settings.FEATURE_EXPORT,
        "watchlists": settings.FEATURE_WATCHLISTS,
        "notifications": settings.FEATURE_NOTIFICATIONS,
        "collaboration": settings.FEATURE_COLLABORATION,
        "reputation_providers": [
            {
                "name": "google_safe_browsing",
                "enabled": bool(settings.FEATURE_REPUTATION),
            },
            {
                "name": "virustotal",
                "enabled": bool(settings.FEATURE_REPUTATION),
            },
            {
                "name": "urlhaus",
                "enabled": bool(settings.FEATURE_REPUTATION),
            },
        ],
    }
