from __future__ import annotations

import pytest
from httpx import AsyncClient
from sqlalchemy import select

from server.core.enums import MembershipRole, UserRole
from server.models.entities import ClassMembership, User
from tests.conftest import auth_headers
from tests.test_duels import _answer_all, _setup_ready_challenge


@pytest.mark.asyncio
async def test_classes_contract_path_has_no_redirect(client: AsyncClient):
    teacher_headers = await auth_headers(client, "teacher@demo.local")
    created = await client.post(
        "/api/v1/classes",
        json={"name": "No redirect", "grade": "7", "description": "Contract path"},
        headers=teacher_headers,
    )
    assert created.status_code == 200
    assert created.history == []
    assert created.json()["data"]["description"] == "Contract path"

    listed = await client.get("/api/v1/classes", headers=teacher_headers)
    assert listed.status_code == 200
    assert listed.history == []


@pytest.mark.asyncio
async def test_subject_and_topic_lists_include_student_progress_contract(client: AsyncClient):
    setup = await _setup_ready_challenge(client)

    subjects = await client.get(
        f"/api/v1/classes/{setup['class_id']}/subjects",
        headers=setup["student1_headers"],
    )
    assert subjects.status_code == 200
    subject = subjects.json()["data"][0]
    assert subject["topics_count"] == 1
    assert subject["average_mastery"] == 0.0
    assert {"class_id", "description", "icon_key", "status"} <= set(subject)

    topics = await client.get(
        f"/api/v1/subjects/{subject['id']}/topics",
        headers=setup["student1_headers"],
    )
    assert topics.status_code == 200
    topic = topics.json()["data"][0]
    assert topic["mastery_percent"] == 0.0
    assert topic["mastery_category"] == "WEAK"
    assert topic["attempts_count"] == 0
    assert {"subject_id", "source_context", "status"} <= set(topic)


@pytest.mark.asyncio
async def test_dashboard_recommends_unattempted_topic(client: AsyncClient):
    setup = await _setup_ready_challenge(client)
    response = await client.get("/api/v1/me/dashboard", headers=setup["student1_headers"])

    assert response.status_code == 200
    payload = response.json()["data"]
    assert payload["recommended_topic"] is not None
    assert payload["recommended_topics"] == [payload["recommended_topic"]]
    assert payload["recommended_topic"]["mastery_percent"] == 0.0


@pytest.mark.asyncio
async def test_attempt_history_has_learning_context_and_rejects_bad_cursor(client: AsyncClient):
    setup = await _setup_ready_challenge(client)
    started = await client.post(
        f"/api/v1/challenges/{setup['challenge_id']}/attempts",
        headers=setup["student1_headers"],
    )
    attempt_id = started.json()["data"]["attempt_id"]
    await _answer_all(client, attempt_id, setup["questions"], setup["student1_headers"])
    await client.post(
        f"/api/v1/attempts/{attempt_id}/finish",
        headers=setup["student1_headers"],
    )

    history = await client.get("/api/v1/me/attempts", headers=setup["student1_headers"])
    assert history.status_code == 200
    item = history.json()["data"]["items"][0]
    assert item["challenge"]["id"] == setup["challenge_id"]
    assert item["topic"]["title"] == "Fractions"
    assert item["subject"]["name"] == "Math"

    invalid = await client.get(
        "/api/v1/me/attempts?cursor=not-a-cursor",
        headers=setup["student1_headers"],
    )
    assert invalid.status_code == 422
    assert invalid.json()["error"]["code"] == "VALIDATION_ERROR"


@pytest.mark.asyncio
async def test_me_duels_uses_public_active_status_and_filter(client: AsyncClient):
    setup = await _setup_ready_challenge(client)
    started = await client.post(
        f"/api/v1/challenges/{setup['challenge_id']}/attempts",
        headers=setup["student1_headers"],
    )
    attempt_id = started.json()["data"]["attempt_id"]
    await _answer_all(client, attempt_id, setup["questions"], setup["student1_headers"])
    await client.post(
        f"/api/v1/attempts/{attempt_id}/finish",
        headers=setup["student1_headers"],
    )
    created = await client.post(
        f"/api/v1/attempts/{attempt_id}/duels",
        headers=setup["student1_headers"],
    )
    share_code = created.json()["data"]["share_code"]
    accepted = await client.post(
        f"/api/v1/duels/code/{share_code}/accept",
        headers=setup["student2_headers"],
    )
    assert accepted.status_code == 200

    listed = await client.get(
        "/api/v1/me/duels?status=ACTIVE",
        headers=setup["student1_headers"],
    )
    assert listed.status_code == 200
    item = listed.json()["data"]["items"][0]
    assert item["status"] == "ACTIVE"
    assert item["opponent_attempt_id"] == accepted.json()["data"]["opponent_attempt_id"]


@pytest.mark.asyncio
async def test_non_teacher_membership_does_not_grant_teacher_duel_access(
    client: AsyncClient, session_factory
):
    setup = await _setup_ready_challenge(client)
    started = await client.post(
        f"/api/v1/challenges/{setup['challenge_id']}/attempts",
        headers=setup["student1_headers"],
    )
    attempt_id = started.json()["data"]["attempt_id"]
    await _answer_all(client, attempt_id, setup["questions"], setup["student1_headers"])
    await client.post(
        f"/api/v1/attempts/{attempt_id}/finish",
        headers=setup["student1_headers"],
    )
    created = await client.post(
        f"/api/v1/attempts/{attempt_id}/duels",
        headers=setup["student1_headers"],
    )

    outsider_headers = await auth_headers(client, "contract-outsider@demo.local")
    async with session_factory() as db:
        outsider = (
            await db.execute(select(User).where(User.identifier == "contract-outsider@demo.local"))
        ).scalar_one()
        outsider.role = UserRole.TEACHER
        db.add(
            ClassMembership(
                class_id=setup["class_id"],
                user_id=outsider.id,
                role=MembershipRole.STUDENT,
            )
        )
        await db.commit()

    response = await client.get(
        f"/api/v1/duels/{created.json()['data']['duel_id']}",
        headers=outsider_headers,
    )
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "FORBIDDEN"
