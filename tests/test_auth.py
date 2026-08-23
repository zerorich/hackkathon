from __future__ import annotations

from datetime import timedelta

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.core.cache import get_cache
from app.core.enums import UserRole, UserStatus
from app.core.security import hash_otp, hash_token
from app.models.entities import OtpChallenge, RefreshSession, User, utcnow


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
