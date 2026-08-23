from __future__ import annotations

import hashlib
import hmac
import secrets
from datetime import UTC, datetime, timedelta
from typing import Any

from jose import JWTError, jwt

from server.core.settings import Settings, get_settings


def hash_otp(code: str, *, secret: str | None = None) -> str:
    secret = secret or get_settings().jwt_secret.get_secret_value()
    return hmac.new(secret.encode(), code.encode(), hashlib.sha256).hexdigest()


def verify_otp(code: str, code_hash: str, *, secret: str | None = None) -> bool:
    return hmac.compare_digest(hash_otp(code, secret=secret), code_hash)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def generate_refresh_token() -> str:
    return secrets.token_urlsafe(48)


def create_access_token(*, user_id: str, role: str, settings: Settings | None = None) -> str:
    settings = settings or get_settings()
    now = datetime.now(UTC)
    payload = {
        "sub": user_id,
        "role": role,
        "type": "access",
        "iat": now,
        "exp": now + timedelta(minutes=settings.jwt_access_ttl_minutes),
    }
    return jwt.encode(
        payload,
        settings.jwt_secret.get_secret_value(),
        algorithm=settings.jwt_algorithm,
    )


def decode_access_token(token: str, settings: Settings | None = None) -> dict[str, Any]:
    settings = settings or get_settings()
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret.get_secret_value(),
            algorithms=[settings.jwt_algorithm],
        )
    except JWTError as exc:
        raise ValueError("Invalid token") from exc
    if payload.get("type") != "access":
        raise ValueError("Invalid token type")
    return payload


def refresh_expires_at(settings: Settings | None = None) -> datetime:
    settings = settings or get_settings()
    return datetime.now(UTC).replace(tzinfo=None) + timedelta(days=settings.jwt_refresh_ttl_days)
