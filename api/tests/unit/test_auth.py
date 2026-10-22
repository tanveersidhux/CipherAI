"""Unit tests for Supabase JWT verification and auth dependencies."""

from datetime import UTC, datetime, timedelta

import jwt
import pytest

from app.core.auth import (
    CurrentUser,
    decode_jwt_token,
    get_current_user,
    get_optional_user,
)
from app.core.config import Settings
from app.core.errors import UnauthenticatedError

TEST_SECRET = "super-secret-supabase-jwt-test-secret-key-32chars"


def create_token(
    sub: str = "user-1234-uuid",
    email: str = "analyst@cipher.internal",
    exp_delta: timedelta = timedelta(hours=1),
    aud: str = "authenticated",
    secret: str = TEST_SECRET,
    alg: str = "HS256",
) -> str:
    now = datetime.now(UTC)
    payload = {
        "sub": sub,
        "email": email,
        "aud": aud,
        "exp": int((now + exp_delta).timestamp()),
        "iat": int(now.timestamp()),
    }
    if alg == "none":
        return jwt.encode(payload, key="", algorithm="none")
    return jwt.encode(payload, key=secret, algorithm=alg)


def test_decode_valid_token() -> None:
    token = create_token()
    payload = decode_jwt_token(token, secret=TEST_SECRET)
    assert payload["sub"] == "user-1234-uuid"
    assert payload["email"] == "analyst@cipher.internal"


def test_decode_expired_token_raises_401() -> None:
    token = create_token(exp_delta=timedelta(seconds=-10))
    with pytest.raises(UnauthenticatedError, match="expired"):
        decode_jwt_token(token, secret=TEST_SECRET)


def test_decode_wrong_audience_raises_401() -> None:
    token = create_token(aud="unauthorized_audience")
    with pytest.raises(UnauthenticatedError, match="audience"):
        decode_jwt_token(token, secret=TEST_SECRET)


def test_decode_wrong_signature_raises_401() -> None:
    token = create_token(secret="different-wrong-secret-key-12345")
    with pytest.raises(UnauthenticatedError, match="signature"):
        decode_jwt_token(token, secret=TEST_SECRET)


def test_decode_alg_none_strictly_rejected() -> None:
    token = create_token(alg="none")
    with pytest.raises(UnauthenticatedError, match="none"):
        decode_jwt_token(token, secret=TEST_SECRET)


def test_get_current_user_dependency_success() -> None:
    token = create_token()
    settings = Settings(_env_file=None, SUPABASE_JWT_SECRET=TEST_SECRET)
    user = get_current_user(authorization=f"Bearer {token}", settings=settings)
    assert isinstance(user, CurrentUser)
    assert user.id == "user-1234-uuid"
    assert user.email == "analyst@cipher.internal"


def test_get_current_user_missing_header_raises() -> None:
    settings = Settings(_env_file=None, SUPABASE_JWT_SECRET=TEST_SECRET)
    with pytest.raises(UnauthenticatedError, match="Authorization header is missing"):
        get_current_user(authorization=None, settings=settings)


def test_get_current_user_malformed_header_raises() -> None:
    settings = Settings(_env_file=None, SUPABASE_JWT_SECRET=TEST_SECRET)
    with pytest.raises(UnauthenticatedError, match="Bearer <token>"):
        get_current_user(authorization="Token12345", settings=settings)


def test_get_optional_user_none_when_header_empty() -> None:
    settings = Settings(_env_file=None, SUPABASE_JWT_SECRET=TEST_SECRET)
    assert get_optional_user(authorization=None, settings=settings) is None
    assert get_optional_user(authorization="", settings=settings) is None


def test_get_optional_user_returns_user_when_valid() -> None:
    token = create_token(sub="guest-turned-user-999")
    settings = Settings(_env_file=None, SUPABASE_JWT_SECRET=TEST_SECRET)
    user = get_optional_user(authorization=f"Bearer {token}", settings=settings)
    assert user is not None
    assert user.id == "guest-turned-user-999"
