from __future__ import annotations

import pytest
from httpx import AsyncClient

from tests.conftest import auth_headers


async def _setup_ready_challenge(client: AsyncClient) -> dict:
    teacher_headers = await auth_headers(client, "teacher@demo.local")
    create = await client.post(
        "/api/v1/classes/",
        json={"name": "Duel Class", "grade": "10", "description": "Duel tests"},
        headers=teacher_headers,
    )
    assert create.status_code == 200
    class_id = create.json()["data"]["id"]
    invite = create.json()["data"]["invite_code"]

    subject = await client.post(
        f"/api/v1/classes/{class_id}/subjects",
        json={"name": "Math"},
        headers=teacher_headers,
    )
    assert subject.status_code == 200
    subject_id = subject.json()["data"]["id"]

    topic = await client.post(
        f"/api/v1/subjects/{subject_id}/topics",
        json={"title": "Fractions", "difficulty": "MEDIUM"},
        headers=teacher_headers,
    )
    assert topic.status_code == 200
    topic_id = topic.json()["data"]["id"]

    challenge = await client.post(
        f"/api/v1/topics/{topic_id}/challenges",
        json={
            "title": "Duel Challenge",
            "difficulty": "MEDIUM",
            "questions": [
                {
                    "prompt": "2 + 2 = ?",
                    "options": [
                        {"text": "3", "is_correct": False},
                        {"text": "4", "is_correct": True},
                    ],
                },
                {
                    "prompt": "3 + 3 = ?",
                    "options": [
                        {"text": "5", "is_correct": False},
                        {"text": "6", "is_correct": True},
                    ],
                },
            ],
        },
        headers=teacher_headers,
    )
    assert challenge.status_code == 200
    challenge_id = challenge.json()["data"]["id"]
    questions = challenge.json()["data"]["questions"]

    student1_headers = await auth_headers(client, "student1@demo.local")
    student2_headers = await auth_headers(client, "student2@demo.local")
    for headers in (student1_headers, student2_headers):
        join = await client.post(
            "/api/v1/classes/join",
            json={"invite_code": invite},
            headers=headers,
        )
        assert join.status_code == 200

    return {
        "class_id": class_id,
        "challenge_id": challenge_id,
        "questions": questions,
        "teacher_headers": teacher_headers,
        "student1_headers": student1_headers,
        "student2_headers": student2_headers,
    }


async def _answer_all(
    client: AsyncClient,
    attempt_id: str,
    questions: list,
    headers: dict,
    *,
    prefer_incorrect: bool = False,
) -> None:
    for question in questions:
        if prefer_incorrect:
            option = next(o for o in question["options"] if not o["is_correct"])
        else:
            option = next(o for o in question["options"] if o["is_correct"])
        resp = await client.put(
            f"/api/v1/attempts/{attempt_id}/answers/{question['id']}",
            json={"selected_option_id": option["id"]},
            headers=headers,
        )
        assert resp.status_code == 200


@pytest.mark.asyncio
async def test_finish_attempt_response_fields(client: AsyncClient):
    setup = await _setup_ready_challenge(client)
    start = await client.post(
        f"/api/v1/challenges/{setup['challenge_id']}/attempts",
        headers=setup["student1_headers"],
    )
    assert start.status_code == 200
    attempt_id = start.json()["data"]["attempt_id"]

    await _answer_all(client, attempt_id, setup["questions"], setup["student1_headers"])
    finish = await client.post(
        f"/api/v1/attempts/{attempt_id}/finish",
        headers=setup["student1_headers"],
    )
    assert finish.status_code == 200
    data = finish.json()["data"]
    assert data["status"] == "COMPLETED"
    assert data["correct_count"] == 2
    assert data["incorrect_count"] == 0
    assert "accuracy_percent" in data
    assert "duration_seconds" in data
    assert "total_xp" in data
    assert "level" in data
    assert "streak" in data
    assert "level_progress" in data
    assert len(data["questions"]) == 2
    for question in data["questions"]:
        assert question["is_correct"] is True
        assert question["correct_option_id"] is not None


@pytest.mark.asyncio
async def test_create_duel_requires_completed_attempt(client: AsyncClient):
    setup = await _setup_ready_challenge(client)
    start = await client.post(
        f"/api/v1/challenges/{setup['challenge_id']}/attempts",
        headers=setup["student1_headers"],
    )
    attempt_id = start.json()["data"]["attempt_id"]

    resp = await client.post(
        f"/api/v1/attempts/{attempt_id}/duels",
        headers=setup["student1_headers"],
    )
    assert resp.status_code == 409
    assert resp.json()["error"]["code"] == "INVALID_ATTEMPT_STATE"


@pytest.mark.asyncio
async def test_duel_already_exists_conflict(client: AsyncClient):
    setup = await _setup_ready_challenge(client)
    start = await client.post(
        f"/api/v1/challenges/{setup['challenge_id']}/attempts",
        headers=setup["student1_headers"],
    )
    attempt_id = start.json()["data"]["attempt_id"]
    await _answer_all(client, attempt_id, setup["questions"], setup["student1_headers"])
    await client.post(
        f"/api/v1/attempts/{attempt_id}/finish",
        headers=setup["student1_headers"],
    )

    first = await client.post(
        f"/api/v1/attempts/{attempt_id}/duels",
        headers=setup["student1_headers"],
    )
    assert first.status_code == 200

    second = await client.post(
        f"/api/v1/attempts/{attempt_id}/duels",
        headers=setup["student1_headers"],
    )
    assert second.status_code == 409
    assert second.json()["error"]["code"] == "DUEL_ALREADY_EXISTS"


@pytest.mark.asyncio
async def test_finish_duel_accept_flow(client: AsyncClient):
    setup = await _setup_ready_challenge(client)

    creator_start = await client.post(
        f"/api/v1/challenges/{setup['challenge_id']}/attempts",
        headers=setup["student1_headers"],
    )
    creator_attempt_id = creator_start.json()["data"]["attempt_id"]
    await _answer_all(
        client, creator_attempt_id, setup["questions"], setup["student1_headers"]
    )
    creator_finish = await client.post(
        f"/api/v1/attempts/{creator_attempt_id}/finish",
        headers=setup["student1_headers"],
    )
    assert creator_finish.status_code == 200

    duel_create = await client.post(
        f"/api/v1/attempts/{creator_attempt_id}/duels",
        headers=setup["student1_headers"],
    )
    assert duel_create.status_code == 200
    share_code = duel_create.json()["data"]["share_code"]
    duel_id = duel_create.json()["data"]["duel_id"]

    accept = await client.post(
        f"/api/v1/duels/code/{share_code}/accept",
        headers=setup["student2_headers"],
    )
    assert accept.status_code == 200
    accept_data = accept.json()["data"]
    assert accept_data["status"] == "ACTIVE"
    assert accept_data["accepted_at"] is not None
    opponent_attempt_id = accept_data["opponent_attempt_id"]

    await _answer_all(
        client,
        opponent_attempt_id,
        setup["questions"],
        setup["student2_headers"],
        prefer_incorrect=True,
    )
    opponent_finish = await client.post(
        f"/api/v1/attempts/{opponent_attempt_id}/finish",
        headers=setup["student2_headers"],
    )
    assert opponent_finish.status_code == 200

    duel_get = await client.get(
        f"/api/v1/duels/{duel_id}",
        headers=setup["student1_headers"],
    )
    assert duel_get.status_code == 200
    duel_data = duel_get.json()["data"]
    assert duel_data["status"] == "COMPLETED"
    assert duel_data["result_type"] == "CHALLENGER_WIN"
    assert duel_data["winner_id"] is not None
    assert duel_data["accepted_at"] is not None
    assert duel_data["challenge"] is not None


@pytest.mark.asyncio
async def test_teacher_dashboard_totals(client: AsyncClient):
    setup = await _setup_ready_challenge(client)

    resp = await client.get(
        f"/api/v1/teacher/classes/{setup['class_id']}/dashboard",
        headers=setup["teacher_headers"],
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert "total_challenges" in data
    assert data["total_challenges"] >= 1
    assert "total_duels" in data
