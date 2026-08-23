from __future__ import annotations

import pytest
from httpx import AsyncClient
from sqlalchemy import select

from server.models.entities import StudentStats, User
from tests.conftest import auth_headers


@pytest.mark.asyncio
async def test_leaderboard_cache_is_personalized_after_cache_read(
    client: AsyncClient, session_factory
):
    teacher_headers = await auth_headers(client, "teacher@demo.local")
    created = await client.post(
        "/api/v1/classes/",
        json={"name": "Cache", "grade": "8"},
        headers=teacher_headers,
    )
    class_id = created.json()["data"]["id"]
    invite_code = created.json()["data"]["invite_code"]

    first_headers = await auth_headers(client, "cache-first@demo.local")
    second_headers = await auth_headers(client, "cache-second@demo.local")
    for headers in (first_headers, second_headers):
        joined = await client.post(
            "/api/v1/classes/join",
            json={"invite_code": invite_code},
            headers=headers,
        )
        assert joined.status_code == 200

    async with session_factory() as session:
        users = (
            (
                await session.execute(
                    select(User).where(
                        User.identifier.in_(["cache-first@demo.local", "cache-second@demo.local"])
                    )
                )
            )
            .scalars()
            .all()
        )
        by_identifier = {user.identifier: user for user in users}
        session.add_all(
            [
                StudentStats(
                    user_id=by_identifier["cache-first@demo.local"].id,
                    class_id=class_id,
                    total_xp=100,
                    attempts_completed=1,
                ),
                StudentStats(
                    user_id=by_identifier["cache-second@demo.local"].id,
                    class_id=class_id,
                    total_xp=200,
                    attempts_completed=2,
                ),
            ]
        )
        await session.commit()

    first = await client.get(
        f"/api/v1/classes/{class_id}/leaderboard?limit=1",
        headers=first_headers,
    )
    assert first.status_code == 200
    assert len(first.json()["data"]["entries"]) == 1

    second = await client.get(
        f"/api/v1/classes/{class_id}/leaderboard?limit=100",
        headers=second_headers,
    )
    assert second.status_code == 200
    payload = second.json()["data"]
    assert len(payload["entries"]) == 2
    assert sum(entry["is_current_user"] for entry in payload["entries"]) == 1
    current = next(entry for entry in payload["entries"] if entry["is_current_user"])
    assert current["user"]["id"] == by_identifier["cache-second@demo.local"].id
    assert "identifier" not in current["user"]
