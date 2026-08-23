from __future__ import annotations

import pytest
from httpx import AsyncClient
from sqlalchemy import select

from server.core.enums import ClassStatus, UserRole
from server.models.entities import SchoolClass, User
from tests.conftest import auth_headers


async def _create_class(client: AsyncClient, teacher_headers: dict[str, str]) -> dict:
    resp = await client.post(
        "/api/v1/classes/",
        json={"name": "10A", "grade": "10", "description": "Test class"},
        headers=teacher_headers,
    )
    assert resp.status_code == 200
    return resp.json()["data"]


async def _admin_headers(client: AsyncClient, session_factory) -> dict[str, str]:
    async with session_factory() as session:
        result = await session.execute(select(User).where(User.identifier == "admin@demo.local"))
        user = result.scalar_one_or_none()
        if user is None:
            user = User(
                identifier="admin@demo.local",
                display_name="admin",
                role=UserRole.ADMIN,
            )
            session.add(user)
        else:
            user.role = UserRole.ADMIN
        await session.commit()
    return await auth_headers(client, "admin@demo.local")


async def _add_class_member(session_factory, class_id: str, user_id: str) -> None:
    from server.core.enums import MembershipRole
    from server.models.entities import ClassMembership

    async with session_factory() as session:
        session.add(
            ClassMembership(
                class_id=class_id,
                user_id=user_id,
                role=MembershipRole.STUDENT,
            )
        )
        await session.commit()


@pytest.mark.asyncio
async def test_join_archived_class_returns_class_archived(
    client: AsyncClient, session_factory
):
    teacher_headers = await auth_headers(client, "teacher@demo.local")
    created = await _create_class(client, teacher_headers)

    async with session_factory() as session:
        school_class = await session.get(SchoolClass, created["id"])
        school_class.status = ClassStatus.ARCHIVED
        await session.commit()

    student_headers = await auth_headers(client, "student1@demo.local")
    resp = await client.post(
        "/api/v1/classes/join",
        json={"invite_code": created["invite_code"]},
        headers=student_headers,
    )
    assert resp.status_code == 410
    assert resp.json()["error"]["code"] == "CLASS_ARCHIVED"


@pytest.mark.asyncio
async def test_list_members_includes_stats(client: AsyncClient):
    teacher_headers = await auth_headers(client, "teacher@demo.local")
    created = await _create_class(client, teacher_headers)

    resp = await client.get(
        f"/api/v1/classes/{created['id']}/members",
        headers=teacher_headers,
    )
    assert resp.status_code == 200
    members = resp.json()["data"]
    assert len(members) >= 1
    teacher_member = next(m for m in members if m["role"] == "TEACHER")
    assert teacher_member["level"] == 0
    assert teacher_member["total_xp"] == 0
    assert teacher_member["streak"] == 0
    assert teacher_member["status"] == "ACTIVE"


@pytest.mark.asyncio
async def test_cannot_remove_last_teacher(client: AsyncClient):
    teacher_headers = await auth_headers(client, "teacher@demo.local")
    created = await _create_class(client, teacher_headers)

    members = await client.get(
        f"/api/v1/classes/{created['id']}/members",
        headers=teacher_headers,
    )
    teacher_id = next(m["user_id"] for m in members.json()["data"] if m["role"] == "TEACHER")

    resp = await client.delete(
        f"/api/v1/classes/{created['id']}/members/{teacher_id}",
        headers=teacher_headers,
    )
    assert resp.status_code == 409
    assert resp.json()["error"]["code"] == "CANNOT_REMOVE_LAST_TEACHER"


@pytest.mark.asyncio
async def test_archive_subject_with_active_topic_fails(client: AsyncClient):
    teacher_headers = await auth_headers(client, "teacher@demo.local")
    created = await _create_class(client, teacher_headers)
    class_id = created["id"]

    subject_resp = await client.post(
        f"/api/v1/classes/{class_id}/subjects",
        json={"name": "Math", "description": "Algebra"},
        headers=teacher_headers,
    )
    subject_id = subject_resp.json()["data"]["id"]

    await client.post(
        f"/api/v1/subjects/{subject_id}/topics",
        json={"title": "Fractions", "difficulty": "EASY"},
        headers=teacher_headers,
    )

    resp = await client.delete(f"/api/v1/subjects/{subject_id}", headers=teacher_headers)
    assert resp.status_code == 409
    assert resp.json()["error"]["code"] == "SUBJECT_HAS_ACTIVE_CONTENT"


@pytest.mark.asyncio
async def test_get_topic_for_student_includes_mastery(client: AsyncClient):
    teacher_headers = await auth_headers(client, "teacher@demo.local")
    created = await _create_class(client, teacher_headers)
    class_id = created["id"]

    subject_resp = await client.post(
        f"/api/v1/classes/{class_id}/subjects",
        json={"name": "Math"},
        headers=teacher_headers,
    )
    subject_id = subject_resp.json()["data"]["id"]

    topic_resp = await client.post(
        f"/api/v1/subjects/{subject_id}/topics",
        json={"title": "Fractions", "difficulty": "EASY"},
        headers=teacher_headers,
    )
    topic_id = topic_resp.json()["data"]["id"]

    student_headers = await auth_headers(client, "student1@demo.local")
    await client.post(
        "/api/v1/classes/join",
        json={"invite_code": created["invite_code"]},
        headers=student_headers,
    )

    resp = await client.get(f"/api/v1/topics/{topic_id}", headers=student_headers)
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["mastery_percent"] == 0.0
    assert data["mastery_category"] == "WEAK"
    assert data["attempts_count"] == 0


@pytest.mark.asyncio
async def test_teacher_not_of_class_cannot_manage_members(client: AsyncClient):
    teacher_a = await auth_headers(client, "teacher@demo.local")
    created = await _create_class(client, teacher_a)

    teacher_b = await auth_headers(client, "teacher2@demo.local")
    resp = await client.get(
        f"/api/v1/classes/{created['id']}/members",
        headers=teacher_b,
    )
    assert resp.status_code == 403
    assert resp.json()["error"]["code"] == "FORBIDDEN"


@pytest.mark.asyncio
async def test_admin_sees_invite_code_in_list(client: AsyncClient, session_factory):
    teacher_headers = await auth_headers(client, "teacher@demo.local")
    created = await _create_class(client, teacher_headers)

    admin_headers = await _admin_headers(client, session_factory)
    async with session_factory() as session:
        result = await session.execute(select(User).where(User.identifier == "admin@demo.local"))
        admin_user = result.scalar_one()
    await _add_class_member(session_factory, created["id"], admin_user.id)

    resp = await client.get("/api/v1/classes/", headers=admin_headers)
    assert resp.status_code == 200
    item = next(c for c in resp.json()["data"] if c["id"] == created["id"])
    assert item["invite_code"] == created["invite_code"]

    get_resp = await client.get(f"/api/v1/classes/{created['id']}", headers=admin_headers)
    assert get_resp.status_code == 200
    assert get_resp.json()["data"]["invite_code"] == created["invite_code"]
