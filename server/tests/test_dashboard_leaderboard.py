from __future__ import annotations

from datetime import timedelta

import pytest
from httpx import AsyncClient
from sqlalchemy import select

from server.core.enums import XpSourceType
from server.models.entities import StudentStats, User, XpLedger, utcnow
from server.services.calculations import calculate_leaderboard_rank_data
from tests.conftest import auth_headers


def test_leaderboard_sort_by_xp_then_completed():
    rows = [
        ("u1", "Alice", 100, 1, 2, 5),
        ("u2", "Bob", 100, 1, 3, 8),
        ("u3", "Carol", 200, 1, 1, 1),
    ]
    ranked = calculate_leaderboard_rank_data(rows)
    assert [r.user_id for r in ranked] == ["u3", "u2", "u1"]


@pytest.mark.asyncio
async def test_leaderboard_week_uses_xp_ledger(
    client: AsyncClient, session_factory
):
    teacher_headers = await auth_headers(client, "teacher@demo.local")
    create = await client.post(
        "/api/v1/classes/",
        json={"name": "10B", "grade": "10", "description": "LB test"},
        headers=teacher_headers,
    )
    class_id = create.json()["data"]["id"]
    invite = create.json()["data"]["invite_code"]

    student_headers = await auth_headers(client, "student-lb@demo.local")
    await client.post(
        "/api/v1/classes/join",
        json={"invite_code": invite},
        headers=student_headers,
    )

    async with session_factory() as session:
        user_result = await session.execute(
            select(User).where(User.identifier == "student-lb@demo.local")
        )
        user = user_result.scalar_one()

        session.add(
            StudentStats(
                user_id=user.id,
                class_id=class_id,
                total_xp=500,
                level=2,
                streak=1,
                attempts_completed=3,
            )
        )
        old_time = utcnow() - timedelta(days=10)
        session.add(
            XpLedger(
                user_id=user.id,
                class_id=class_id,
                source_type=XpSourceType.ATTEMPT,
                source_id="old-attempt",
                amount=400,
                created_at=old_time,
            )
        )
        session.add(
            XpLedger(
                user_id=user.id,
                class_id=class_id,
                source_type=XpSourceType.ATTEMPT,
                source_id="new-attempt",
                amount=50,
            )
        )
        await session.commit()

    resp = await client.get(
        f"/api/v1/classes/{class_id}/leaderboard?period=week",
        headers=student_headers,
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["period"] == "week"
    assert len(data["entries"]) == 1
    assert data["entries"][0]["period_xp"] == 50
    assert data["entries"][0]["total_xp"] == 500
    assert data["current_user_rank"] == 1


@pytest.mark.asyncio
async def test_dashboard_returns_aggregate(client: AsyncClient):
    teacher_headers = await auth_headers(client, "teacher@demo.local")
    create = await client.post(
        "/api/v1/classes/",
        json={"name": "11A", "grade": "11", "description": "Dash test"},
        headers=teacher_headers,
    )
    assert create.status_code == 200
    invite = create.json()["data"]["invite_code"]

    student_headers = await auth_headers(client, "student-dash@demo.local")
    join = await client.post(
        "/api/v1/classes/join",
        json={"invite_code": invite},
        headers=student_headers,
    )
    assert join.status_code == 200

    resp = await client.get("/api/v1/me/dashboard", headers=student_headers)
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert "profile" in data
    assert data["class"]["name"] == "11A"
    assert "total_xp" in data
    assert "best_streak" in data
    assert "leaderboard_preview" in data
    assert "subjects" in data


@pytest.mark.asyncio
async def test_attempts_cursor_pagination(client: AsyncClient):
    student_headers = await auth_headers(client, "student-page@demo.local")
    resp = await client.get("/api/v1/me/attempts?limit=1", headers=student_headers)
    assert resp.status_code == 200
    body = resp.json()["data"]
    assert "items" in body
    assert "next_cursor" in body
