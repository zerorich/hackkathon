from __future__ import annotations

import pytest
from httpx import AsyncClient
from sqlalchemy import select

from server.core.enums import UserRole
from server.models.entities import User
from tests.conftest import auth_headers

ADMIN_OPERATIONS = {
    ("GET", "/api/v1/admin/overview"),
    ("GET", "/api/v1/admin/users"),
    ("PATCH", "/api/v1/admin/users/{target_user_id}/status"),
    ("GET", "/api/v1/admin/challenges"),
    ("PATCH", "/api/v1/admin/challenges/{challenge_id}/status"),
    ("GET", "/api/v1/admin/ai-jobs"),
    ("POST", "/api/v1/admin/ai-jobs/{job_id}/retry"),
}


async def _admin_headers(client: AsyncClient, session_factory) -> dict[str, str]:
    async with session_factory() as session:
        result = await session.execute(select(User).where(User.identifier == "admin@demo.local"))
        user = result.scalar_one_or_none()
        if user is None:
            user = User(
                identifier="admin@demo.local",
                display_name="Demo Admin",
                role=UserRole.ADMIN,
            )
            session.add(user)
        else:
            user.role = UserRole.ADMIN
        await session.commit()
    return await auth_headers(client, "admin@demo.local")


@pytest.mark.asyncio
async def test_every_admin_operation_exists_in_openapi(client: AsyncClient):
    response = await client.get("/openapi.json")
    assert response.status_code == 200
    available = {
        (method.upper(), path)
        for path, operations in response.json()["paths"].items()
        for method in operations
        if method.upper() in {"GET", "POST", "PUT", "PATCH", "DELETE"}
    }
    assert ADMIN_OPERATIONS - available == set()


@pytest.mark.asyncio
async def test_teacher_cannot_access_admin_monitoring(client: AsyncClient):
    headers = await auth_headers(client, "teacher@demo.local")
    for path in (
        "/api/v1/admin/overview",
        "/api/v1/admin/users",
        "/api/v1/admin/challenges",
        "/api/v1/admin/ai-jobs",
    ):
        response = await client.get(path, headers=headers)
        assert response.status_code == 403
        assert response.json()["error"]["code"] == "FORBIDDEN"


@pytest.mark.asyncio
async def test_admin_monitoring_payloads_support_portal(client: AsyncClient, session_factory):
    headers = await _admin_headers(client, session_factory)

    overview = await client.get("/api/v1/admin/overview", headers=headers)
    users = await client.get("/api/v1/admin/users", headers=headers)
    challenges = await client.get("/api/v1/admin/challenges", headers=headers)
    jobs = await client.get("/api/v1/admin/ai-jobs", headers=headers)

    assert overview.status_code == 200
    assert {
        "total_users",
        "total_students",
        "total_teachers",
        "total_classes",
        "total_attempts",
        "ai_generations",
        "ai_failures",
        "duels",
    } <= overview.json()["data"].keys()
    assert users.status_code == 200
    assert all("user" in row and "created_at" in row for row in users.json()["data"])
    assert challenges.status_code == 200
    assert isinstance(challenges.json()["data"], list)
    assert jobs.status_code == 200
    assert isinstance(jobs.json()["data"], list)


@pytest.mark.asyncio
async def test_admin_cannot_block_own_account(client: AsyncClient, session_factory):
    headers = await _admin_headers(client, session_factory)
    me = await client.get("/api/v1/auth/me", headers=headers)
    admin_id = me.json()["data"]["id"]

    response = await client.patch(
        f"/api/v1/admin/users/{admin_id}/status",
        json={"status": "BLOCKED"},
        headers=headers,
    )

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "CONFLICT"


@pytest.mark.asyncio
async def test_admin_can_block_and_restore_another_user(client: AsyncClient, session_factory):
    headers = await _admin_headers(client, session_factory)
    student_headers = await auth_headers(client, "student1@demo.local")
    me = await client.get("/api/v1/auth/me", headers=student_headers)
    student_id = me.json()["data"]["id"]

    blocked = await client.patch(
        f"/api/v1/admin/users/{student_id}/status",
        json={"status": "BLOCKED"},
        headers=headers,
    )
    assert blocked.status_code == 200

    denied = await client.get("/api/v1/auth/me", headers=student_headers)
    assert denied.status_code == 403
    assert denied.json()["error"]["code"] == "USER_BLOCKED"

    restored = await client.patch(
        f"/api/v1/admin/users/{student_id}/status",
        json={"status": "ACTIVE"},
        headers=headers,
    )
    assert restored.status_code == 200
