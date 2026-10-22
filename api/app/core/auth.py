"""Authentication dependency and Supabase JWT verification.

Verifies bearer tokens issued by Supabase Auth, validating signatures,
expiration timestamps, audience, and extracting typed CurrentUser identity.
Never logs tokens or secrets.
"""

import logging
from typing import Any

import jwt
from fastapi import Depends, Header
from pydantic import BaseModel, ConfigDict, Field

from app.core.config import Settings, get_settings
from app.core.errors import UnauthenticatedError

logger = logging.getLogger("cipher.auth")


class CurrentUser(BaseModel):
    """Authenticated user context derived exclusively from verified JWT."""

    model_config = ConfigDict(extra="forbid")

    id: str = Field(..., description="Unique UUID subject identifier (auth.users.id).")
    email: str | None = Field(default=None, description="Optional verified user email address.")


def decode_jwt_token(
    token: str,
    secret: str | None,
    expected_audience: str = "authenticated",
) -> dict[str, Any]:
    """Decode and validate a Supabase Auth JWT token.

    Rejects 'none' algorithm, validates expiry, audience, and cryptographic signature
    when secret is configured.
    """
    if not token or not token.strip():
        raise UnauthenticatedError("Authentication token is empty.")

    # Inspect header to reject unsigned tokens
    try:
        unverified_header = jwt.get_unverified_header(token)
    except Exception as exc:
        raise UnauthenticatedError(f"Malformed token header: {exc!s}") from exc

    alg = unverified_header.get("alg", "").lower()
    if alg == "none":
        raise UnauthenticatedError("Unsigned tokens with algorithm 'none' are strictly forbidden.")

    # Verification options
    verify_signature = bool(secret and secret.strip())
    decode_kwargs: dict[str, Any] = {
        "algorithms": ["HS256", "RS256", "ES256"],
        "options": {
            "verify_signature": verify_signature,
            "verify_exp": True,
            "verify_aud": True,
            "require": ["exp", "sub"],
        },
    }

    if verify_signature:
        decode_kwargs["key"] = secret
    else:
        decode_kwargs["options"]["verify_signature"] = False

    decode_kwargs["audience"] = expected_audience

    try:
        payload = jwt.decode(token, **decode_kwargs)
    except jwt.ExpiredSignatureError as exc:
        raise UnauthenticatedError("Authentication token has expired.") from exc
    except jwt.InvalidAudienceError as exc:
        raise UnauthenticatedError("Authentication token audience is invalid.") from exc
    except jwt.InvalidSignatureError as exc:
        raise UnauthenticatedError("Authentication token signature verification failed.") from exc
    except Exception as exc:
        raise UnauthenticatedError(f"Invalid authentication token: {exc!s}") from exc

    sub = payload.get("sub")
    if not sub or not str(sub).strip():
        raise UnauthenticatedError("Token subject (sub) is missing or empty.")

    return payload


def get_current_user(
    authorization: str | None = Header(default=None),
    settings: Settings = Depends(get_settings),
) -> CurrentUser:
    """FastAPI dependency requiring a valid Bearer token for protected routes."""
    if not authorization:
        raise UnauthenticatedError("Authorization header is missing.")

    parts = authorization.strip().split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise UnauthenticatedError("Authorization header must follow 'Bearer <token>' format.")

    token = parts[1]
    secret = (
        settings.SUPABASE_JWT_SECRET.get_secret_value() if settings.SUPABASE_JWT_SECRET else None
    )

    payload = decode_jwt_token(token=token, secret=secret)
    return CurrentUser(
        id=str(payload["sub"]),
        email=payload.get("email"),
    )


def get_optional_user(
    authorization: str | None = Header(default=None),
    settings: Settings = Depends(get_settings),
) -> CurrentUser | None:
    """FastAPI dependency supporting both guest scans and authenticated user scans."""
    if not authorization or not authorization.strip():
        return None

    parts = authorization.strip().split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise UnauthenticatedError("Authorization header must follow 'Bearer <token>' format.")

    token = parts[1]
    secret = (
        settings.SUPABASE_JWT_SECRET.get_secret_value() if settings.SUPABASE_JWT_SECRET else None
    )

    payload = decode_jwt_token(token=token, secret=secret)
    return CurrentUser(
        id=str(payload["sub"]),
        email=payload.get("email"),
    )
