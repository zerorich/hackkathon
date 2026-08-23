from __future__ import annotations

import pytest
from httpx import AsyncClient

from tests.conftest import auth_headers


@pytest.mark.asyncio
async def test_health(client: AsyncClient):
    resp = await client.get("/api/v1/health")
    assert resp.status_code == 200
    assert resp.json()["data"]["status"] == "ok"


@pytest.mark.asyncio
async def test_otp_auth_flow(client: AsyncClient):
    resp = await client.post(
        "/api/v1/auth/otp/request",
        json={"identifier": "student1@demo.local"},
    )
    assert resp.status_code == 200
    assert resp.json()["data"]["sent"] is True

    resp = await client.post(
        "/api/v1/auth/otp/verify",
        json={"identifier": "student1@demo.local", "code": "123456"},
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert "access_token" in data
    assert "is_new_user" in data
    assert data["user"]["identifier"] == "student1@demo.local"


@pytest.mark.asyncio
async def test_auth_me(client: AsyncClient):
    headers = await auth_headers(client, "teacher@demo.local")
    resp = await client.get("/api/v1/auth/me", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["data"]["identifier"] == "teacher@demo.local"


@pytest.mark.asyncio
async def test_teacher_create_class_and_student_join(client: AsyncClient):
    teacher_headers = await auth_headers(client, "teacher@demo.local")
    create = await client.post(
        "/api/v1/classes/",
        json={"name": "10A", "grade": "10", "description": "Test class"},
        headers=teacher_headers,
    )
    assert create.status_code == 200
    invite = create.json()["data"]["invite_code"]

    student_headers = await auth_headers(client, "student1@demo.local")
    join = await client.post(
        "/api/v1/classes/join",
        json={"invite_code": invite},
        headers=student_headers,
    )
    assert join.status_code == 200
    assert join.json()["data"]["name"] == "10A"


@pytest.mark.asyncio
async def test_error_envelope_on_unauthorized(client: AsyncClient):
    resp = await client.get("/api/v1/auth/me")
    assert resp.status_code == 401
    body = resp.json()
    assert "error" in body
    assert body["error"]["code"] == "UNAUTHORIZED"
