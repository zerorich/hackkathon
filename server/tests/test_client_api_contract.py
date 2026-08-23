from __future__ import annotations

import pytest
from httpx import AsyncClient

from tests.test_duels import _answer_all, _setup_ready_challenge

# Every method/path template currently called through client/src/lib/api.  This
# catches accidental route removals and verifies that the UI is wired to the
# active router rather than the legacy modules kept for migration reference.
CLIENT_OPERATIONS = {
    ("GET", "/api/v1/classes"),
    ("GET", "/api/v1/auth/me"),
    ("POST", "/api/v1/auth/otp/request"),
    ("POST", "/api/v1/auth/otp/verify"),
    ("POST", "/api/v1/auth/login"),
    ("POST", "/api/v1/auth/logout"),
    ("PATCH", "/api/v1/auth/me"),
    ("GET", "/api/v1/duels/{duel_id}"),
    ("GET", "/api/v1/duels/code/{share_code}"),
    ("POST", "/api/v1/duels/code/{share_code}/accept"),
    ("GET", "/api/v1/me/duels"),
    ("POST", "/api/v1/classes/join"),
    ("GET", "/api/v1/classes/{class_id}/subjects"),
    ("GET", "/api/v1/attempts/{attempt_id}"),
    ("GET", "/api/v1/me/stats"),
    ("POST", "/api/v1/attempts/{attempt_id}/duels"),
    ("POST", "/api/v1/attempts/{attempt_id}/duels/bot"),
    ("POST", "/api/v1/challenges/{challenge_id}/attempts"),
    ("GET", "/api/v1/ai/chat/conversations"),
    ("POST", "/api/v1/ai/chat/conversations"),
    ("GET", "/api/v1/ai/chat/conversations/{conversation_id}/messages"),
    ("POST", "/api/v1/ai/chat/conversations/{conversation_id}/messages"),
    ("GET", "/api/v1/me/dashboard"),
    ("GET", "/api/v1/topics/{topic_id}"),
    ("GET", "/api/v1/topics/{topic_id}/challenges"),
    ("GET", "/api/v1/me/attempts"),
    ("POST", "/api/v1/topics/{topic_id}/challenges/generate"),
    ("GET", "/api/v1/challenges/{challenge_id}"),
    ("GET", "/api/v1/challenges/{challenge_id}/status"),
    ("PUT", "/api/v1/attempts/{attempt_id}/answers/{question_id}"),
    ("POST", "/api/v1/attempts/{attempt_id}/finish"),
    ("GET", "/api/v1/classes/{class_id}/leaderboard"),
    ("GET", "/api/v1/subjects/{subject_id}/topics"),
    ("GET", "/api/v1/me/topics/progress"),
    ("GET", "/api/v1/teacher/classes/{class_id}/topics/analytics"),
    ("GET", "/api/v1/teacher/classes/{class_id}/reports/overview"),
    ("POST", "/api/v1/topics/{topic_id}/challenges"),
    ("PATCH", "/api/v1/challenges/{challenge_id}/status"),
    ("GET", "/api/v1/teacher/topics/{topic_id}/analytics"),
    ("POST", "/api/v1/subjects/{subject_id}/topics"),
    ("GET", "/api/v1/teacher/classes/{class_id}/students"),
    ("DELETE", "/api/v1/classes/{class_id}/members/{user_id}"),
    ("POST", "/api/v1/classes/{class_id}/subjects"),
    ("GET", "/api/v1/classes/{class_id}"),
    ("GET", "/api/v1/teacher/classes/{class_id}/activity"),
    ("GET", "/api/v1/teacher/classes/{class_id}/students/{student_user_id}"),
    ("GET", "/api/v1/teacher/classes/{class_id}/dashboard"),
    ("POST", "/api/v1/classes"),
}


@pytest.mark.asyncio
async def test_every_client_operation_exists_in_openapi(client: AsyncClient):
    response = await client.get("/openapi.json")
    assert response.status_code == 200
    paths = response.json()["paths"]
    available = {
        (method.upper(), path)
        for path, operations in paths.items()
        for method in operations
        if method.upper() in {"GET", "POST", "PUT", "PATCH", "DELETE"}
    }
    assert CLIENT_OPERATIONS - available == set()


@pytest.mark.asyncio
async def test_in_progress_attempt_can_be_restored_without_leaking_answers(client: AsyncClient):
    setup = await _setup_ready_challenge(client)
    start = await client.post(
        f"/api/v1/challenges/{setup['challenge_id']}/attempts",
        headers=setup["student1_headers"],
    )
    assert start.status_code == 200
    attempt_id = start.json()["data"]["attempt_id"]
    first_question = setup["questions"][0]
    selected_option = first_question["options"][0]
    saved = await client.put(
        f"/api/v1/attempts/{attempt_id}/answers/{first_question['id']}",
        json={"selected_option_id": selected_option["id"]},
        headers=setup["student1_headers"],
    )
    assert saved.status_code == 200

    restored = await client.get(
        f"/api/v1/attempts/{attempt_id}",
        headers=setup["student1_headers"],
    )
    assert restored.status_code == 200
    payload = restored.json()["data"]
    assert payload["status"] == "IN_PROGRESS"
    assert payload["challenge"]["id"] == setup["challenge_id"]
    assert payload["answers"] == [
        {
            "question_id": first_question["id"],
            "selected_option_id": selected_option["id"],
        }
    ]
    for question in payload["challenge"]["questions"]:
        assert "is_correct" not in question
        assert "correct_option_id" not in question
        assert all("is_correct" not in option for option in question["options"])


@pytest.mark.asyncio
async def test_password_registration_login_and_role_contract(client: AsyncClient):
    identifier = "mvp-teacher@example.com"
    requested = await client.post(
        "/api/v1/auth/otp/request",
        json={"identifier": identifier},
    )
    assert requested.status_code == 200
    registered = await client.post(
        "/api/v1/auth/otp/verify",
        json={
            "identifier": identifier,
            "code": "123456",
            "password": "safe-password",
            "role": "TEACHER",
        },
    )
    assert registered.status_code == 200
    user = registered.json()["data"]["user"]
    assert user["role"] == "TEACHER"
    assert user["has_password"] is True

    logged_in = await client.post(
        "/api/v1/auth/login",
        json={"identifier": identifier, "password": "safe-password"},
    )
    assert logged_in.status_code == 200
    assert logged_in.json()["data"]["user"]["id"] == user["id"]
    assert logged_in.json()["data"]["user"]["has_password"] is True

    rejected = await client.post(
        "/api/v1/auth/login",
        json={"identifier": identifier, "password": "wrong-password"},
    )
    assert rejected.status_code == 401
    assert rejected.json()["error"]["code"] == "INVALID_CREDENTIALS"


@pytest.mark.asyncio
async def test_public_registration_cannot_escalate_to_admin(client: AsyncClient):
    identifier = "not-an-admin@example.com"
    requested = await client.post(
        "/api/v1/auth/otp/request",
        json={"identifier": identifier},
    )
    assert requested.status_code == 200
    response = await client.post(
        "/api/v1/auth/otp/verify",
        json={
            "identifier": identifier,
            "code": "123456",
            "password": "safe-password",
            "role": "ADMIN",
        },
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


@pytest.mark.asyncio
async def test_bot_duel_brand_and_month_leaderboard_contract(client: AsyncClient):
    setup = await _setup_ready_challenge(client)
    start = await client.post(
        f"/api/v1/challenges/{setup['challenge_id']}/attempts",
        headers=setup["student1_headers"],
    )
    attempt_id = start.json()["data"]["attempt_id"]
    await _answer_all(client, attempt_id, setup["questions"], setup["student1_headers"])
    finished = await client.post(
        f"/api/v1/attempts/{attempt_id}/finish",
        headers=setup["student1_headers"],
    )
    assert finished.status_code == 200

    bot_duel = await client.post(
        f"/api/v1/attempts/{attempt_id}/duels/bot",
        headers=setup["student1_headers"],
    )
    assert bot_duel.status_code == 200
    duel = await client.get(
        f"/api/v1/duels/{bot_duel.json()['data']['duel_id']}",
        headers=setup["student1_headers"],
    )
    assert duel.status_code == 200
    assert duel.json()["data"]["opponent"]["user"]["display_name"] == "Zehn AI Bot"

    leaderboard = await client.get(
        f"/api/v1/classes/{setup['class_id']}/leaderboard?period=month&limit=50",
        headers=setup["student1_headers"],
    )
    assert leaderboard.status_code == 200
    board = leaderboard.json()["data"]
    assert board["period"] == "month"
    assert board["entries"]
    assert board["entries"][0]["period_xp"] is not None
