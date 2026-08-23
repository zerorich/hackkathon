from __future__ import annotations

import asyncio
from datetime import timedelta

import pytest
from httpx import AsyncClient
from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from server.core.cache import get_cache
from server.core.enums import UserRole, UserStatus
from server.core.security import hash_otp, hash_token
from server.core.settings import Settings
from server.models.entities import OtpChallenge, RefreshSession, User, utcnow
from server.services.domain import AuthService


async def _verify(client: AsyncClient, identifier: str) -> dict:
    await client.post("/api/v1/auth/otp/request", json={"identifier": identifier})
    resp = await client.post(
        "/api/v1/auth/otp/verify",
        json={"identifier": identifier, "code": "123456"},
    )
    assert resp.status_code == 200
    return resp.json()["data"]


@pytest.mark.asyncio
async def test_otp_verify_is_new_user(client: AsyncClient):
    identifier = "newuser@demo.local"
    data = await _verify(client, identifier)
    assert data["is_new_user"] is True

    await get_cache().delete(f"otp:cooldown:{identifier}")
    await client.post("/api/v1/auth/otp/request", json={"identifier": identifier})
    resp = await client.post(
        "/api/v1/auth/otp/verify",
        json={"identifier": identifier, "code": "123456"},
    )
    assert resp.status_code == 200
    assert resp.json()["data"]["is_new_user"] is False


@pytest.mark.asyncio
async def test_refresh_rotation_returns_new_token(client: AsyncClient):
    data = await _verify(client, "rotate@demo.local")
    old_refresh = data["refresh_token"]

    resp = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": old_refresh},
    )
    assert resp.status_code == 200
    new_data = resp.json()["data"]
    assert new_data["refresh_token"] != old_refresh
    assert "access_token" in new_data

    # old token must no longer work
    resp = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": old_refresh},
    )
    assert resp.status_code == 401
    assert resp.json()["error"]["code"] == "REFRESH_REUSED"


@pytest.mark.asyncio
async def test_refresh_reuse_invalidates_family(
    client: AsyncClient, session_factory: async_sessionmaker[AsyncSession]
):
    data = await _verify(client, "family@demo.local")
    refresh_a = data["refresh_token"]

    resp = await client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_a})
    assert resp.status_code == 200
    refresh_b = resp.json()["data"]["refresh_token"]

    # attacker replays rotated token A
    resp = await client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_a})
    assert resp.status_code == 401
    assert resp.json()["error"]["code"] == "REFRESH_REUSED"

    # legitimate token B in same family must also be dead
    resp = await client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_b})
    assert resp.status_code == 401
    assert resp.json()["error"]["code"] == "SESSION_REVOKED"

    async with session_factory() as db:
        result = await db.execute(
            select(RefreshSession).where(RefreshSession.token_hash == hash_token(refresh_b))
        )
        session = result.scalar_one()
        assert session.revoked_at is not None


@pytest.mark.asyncio
async def test_user_blocked_on_otp_request(
    client: AsyncClient, session_factory: async_sessionmaker[AsyncSession]
):
    identifier = "blocked-req@demo.local"
    async with session_factory() as db:
        db.add(
            User(
                identifier=identifier,
                display_name="blocked",
                role=UserRole.STUDENT,
                status=UserStatus.BLOCKED,
            )
        )
        await db.commit()

    resp = await client.post("/api/v1/auth/otp/request", json={"identifier": identifier})
    assert resp.status_code == 403
    assert resp.json()["error"]["code"] == "USER_BLOCKED"


@pytest.mark.asyncio
async def test_user_blocked_on_otp_verify(
    client: AsyncClient, session_factory: async_sessionmaker[AsyncSession]
):
    identifier = "blocked-verify@demo.local"
    async with session_factory() as db:
        db.add(
            User(
                identifier=identifier,
                display_name="blocked",
                role=UserRole.STUDENT,
                status=UserStatus.BLOCKED,
            )
        )
        db.add(
            OtpChallenge(
                identifier=identifier,
                code_hash=hash_otp("123456"),
                expires_at=utcnow() + timedelta(minutes=5),
            )
        )
        await db.commit()

    resp = await client.post(
        "/api/v1/auth/otp/verify",
        json={"identifier": identifier, "code": "123456"},
    )
    assert resp.status_code == 403
    assert resp.json()["error"]["code"] == "USER_BLOCKED"
    assert "access_token" not in resp.json().get("data", {})


@pytest.mark.asyncio
async def test_logout_revokes_refresh_session(client: AsyncClient):
    data = await _verify(client, "logout@demo.local")
    refresh = data["refresh_token"]
    access = data["access_token"]
    headers = {"Authorization": f"Bearer {access}"}

    resp = await client.post(
        "/api/v1/auth/logout",
        json={"refresh_token": refresh},
        headers=headers,
    )
    assert resp.status_code == 200
    assert resp.json()["data"]["logged_out"] is True

    resp = await client.post("/api/v1/auth/refresh", json={"refresh_token": refresh})
    assert resp.status_code == 401
    assert resp.json()["error"]["code"] == "SESSION_REVOKED"


@pytest.mark.asyncio
async def test_invalid_otp_limit_survives_request_rollbacks(client: AsyncClient):
    identifier = "rate-limit@demo.local"
    await client.post("/api/v1/auth/otp/request", json={"identifier": identifier})

    for _ in range(5):
        response = await client.post(
            "/api/v1/auth/otp/verify",
            json={"identifier": identifier, "code": "000000"},
        )
        assert response.status_code == 401

    response = await client.post(
        "/api/v1/auth/otp/verify",
        json={"identifier": identifier, "code": "123456"},
    )
    assert response.status_code == 429
    assert response.json()["error"]["code"] == "OTP_TOO_MANY_ATTEMPTS"
    assert await get_cache().get(f"otp:verify:{identifier}") == 6


@pytest.mark.asyncio
async def test_non_demo_otp_is_random_and_demo_code_cannot_authenticate(
    session_factory: async_sessionmaker[AsyncSession], monkeypatch
):
    delivered: list[tuple[str, str]] = []

    async def capture_delivery(self, identifier: str, code: str) -> None:
        delivered.append((identifier, code))

    monkeypatch.setattr(AuthService, "_deliver_otp", capture_delivery)
    monkeypatch.setattr("server.services.domain.secrets.randbelow", lambda _limit: 654321)
    settings = Settings(otp_demo_mode=False, otp_delivery_webhook_url="https://otp.invalid")

    async with session_factory() as db:
        service = AuthService(db, settings=settings)
        response = await service.request_otp("REAL@EXAMPLE.COM")
        assert response == {"sent": True, "demo_code": None}
        assert delivered == [("real@example.com", "654321")]

        result = await db.execute(
            select(OtpChallenge).where(OtpChallenge.identifier == "real@example.com")
        )
        challenge = result.scalar_one()
        assert challenge.code_hash == hash_otp("654321")
        assert challenge.code_hash != hash_otp(settings.otp_demo_code)


@pytest.mark.asyncio
async def test_teacher_like_identifier_registers_as_student(client: AsyncClient):
    data = await _verify(client, "teacher-attacker@example.com")
    assert data["user"]["role"] == UserRole.STUDENT


@pytest.mark.asyncio
async def test_concurrent_refresh_allows_only_one_rotation(client: AsyncClient):
    data = await _verify(client, "concurrent-refresh@demo.local")
    refresh_token = data["refresh_token"]

    first, second = await asyncio.gather(
        client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token}),
        client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token}),
    )
    assert sorted((first.status_code, second.status_code)) == [200, 401]
    rejected = first if first.status_code == 401 else second
    assert rejected.json()["error"]["code"] == "REFRESH_REUSED"


def test_production_rejects_known_jwt_secret():
    with pytest.raises(ValidationError, match="JWT_SECRET"):
        Settings(
            app_env="production",
            database_url="postgresql+asyncpg://db/app",
            jwt_secret="dev-secret-change-in-production",
            otp_demo_mode=False,
            otp_delivery_webhook_url="https://otp.example.test/send",
            agentrouter_api_key="real-agent-key",
        )


def test_production_rejects_demo_otp_mode():
    with pytest.raises(ValidationError, match="OTP_DEMO_MODE"):
        Settings(
            app_env="production",
            database_url="postgresql+asyncpg://db/app",
            jwt_secret="a-unique-production-secret-at-least-32-chars",
            otp_demo_mode=True,
            otp_delivery_webhook_url="https://otp.example.test/send",
            agentrouter_api_key="real-agent-key",
        )


@pytest.mark.parametrize(
    ("override", "expected_error"),
    [
        ({"jwt_secret": "replace-with-a-unique-secret-of-at-least-32-characters"}, "JWT_SECRET"),
        (
            {"otp_delivery_webhook_url": "https://your-otp-provider.example/send"},
            "OTP_DELIVERY_WEBHOOK_URL",
        ),
        ({"agentrouter_api_key": "replace-with-real-provider-key"}, "AGENTROUTER_API_KEY"),
    ],
)
def test_production_rejects_template_placeholders(override, expected_error):
    values = {
        "app_env": "production",
        "database_url": "postgresql+asyncpg://user:pass@db/app",
        "redis_url": "redis://redis:6379/0",
        "jwt_secret": "a-unique-production-secret-at-least-32-chars",
        "otp_demo_mode": False,
        "otp_delivery_webhook_url": "https://otp.example.test/send",
        "agentrouter_api_key": "real-provider-key",
    }
    values.update(override)
    with pytest.raises(ValidationError, match=expected_error):
        Settings(**values)
