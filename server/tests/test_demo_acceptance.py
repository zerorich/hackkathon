from __future__ import annotations

import asyncio
from unittest.mock import AsyncMock

import pytest
from httpx import AsyncClient
from sqlalchemy import func, select

from server.ai.fixtures import get_fixture
from server.ai.validator import validate_ai_challenge_output
from server.core.enums import AttemptStatus
from server.core.settings import clear_settings_cache
from server.models.entities import (
    ActivityEvent,
    Attempt,
    SchoolClass,
    StudentStats,
    Subject,
    Topic,
    TopicProgress,
    XpLedger,
)
from server.seed.demo import run_seed
from server.services.orchestrator import get_orchestrator


@pytest.mark.asyncio
async def test_demo_seed_populates_presentation_dataset(session_factory):
    async with session_factory() as session:
        result = await run_seed(session)
        await session.commit()

    assert result["teacher"] == "teacher@demo.local"
    assert len(result["students"]) == 5

    async with session_factory() as session:
        class_9a = await session.scalar(select(SchoolClass).where(SchoolClass.name == "9A"))
        subjects = (
            (await session.execute(select(Subject).where(Subject.class_id == class_9a.id)))
            .scalars()
            .all()
        )
        assert {subject.name for subject in subjects} == {
            "Mathematics",
            "English",
            "Physics",
        }

        topics = (
            (
                await session.execute(
                    select(Topic).join(Subject).where(Subject.class_id == class_9a.id)
                )
            )
            .scalars()
            .all()
        )
        assert {topic.title for topic in topics} == {
            "Quadratic Equations",
            "Fractions",
            "Linear Functions",
            "Present Perfect",
            "Conditionals",
            "Newton's Laws",
            "Energy",
        }

        completed = await session.scalar(
            select(func.count())
            .select_from(Attempt)
            .where(Attempt.status == AttemptStatus.COMPLETED)
        )
        stats = (await session.execute(select(StudentStats))).scalars().all()
        progress = (await session.execute(select(TopicProgress))).scalars().all()
        xp_entries = int(await session.scalar(select(func.count()).select_from(XpLedger)) or 0)
        activities = int(await session.scalar(select(func.count()).select_from(ActivityEvent)) or 0)

        assert int(completed or 0) >= 15
        assert len(stats) == 5
        assert all(row.total_xp > 0 and row.total_answers > 0 for row in stats)
        assert all(row.average_accuracy >= 0 and row.last_attempt_at is not None for row in stats)
        assert xp_entries >= 15
        assert progress
        assert any(row.mastery_category == "WEAK" for row in progress)
        assert activities >= 15

    # The seed is safe to run again and must not duplicate presentation attempts.
    async with session_factory() as session:
        before = int(await session.scalar(select(func.count()).select_from(Attempt)) or 0)
        await run_seed(session)
        await session.commit()
        after = int(await session.scalar(select(func.count()).select_from(Attempt)) or 0)
        assert after == before


async def _login(client: AsyncClient, identifier: str) -> dict[str, str]:
    requested = await client.post("/api/v1/auth/otp/request", json={"identifier": identifier})
    assert requested.status_code == 200
    verified = await client.post(
        "/api/v1/auth/otp/verify",
        json={"identifier": identifier, "code": "123456"},
    )
    assert verified.status_code == 200
    return {"Authorization": f"Bearer {verified.json()['data']['access_token']}"}


async def _submit_answers(
    client: AsyncClient,
    attempt_id: str,
    questions: list[dict],
    headers: dict[str, str],
    *,
    correct: bool,
) -> None:
    for question in questions:
        selected = next(option for option in question["options"] if option["is_correct"] is correct)
        response = await client.put(
            f"/api/v1/attempts/{attempt_id}/answers/{question['id']}",
            json={"selected_option_id": selected["id"]},
            headers=headers,
        )
        assert response.status_code == 200


@pytest.mark.asyncio
async def test_backend_golden_path_only_through_api(
    client: AsyncClient,
    session_factory,
    monkeypatch,
):
    monkeypatch.setenv("AI_JOB_POLL_INTERVAL_SECONDS", "0.1")
    clear_settings_cache()
    orchestrator = get_orchestrator()
    orchestrator._client.generate_challenge = AsyncMock(
        return_value=validate_ai_challenge_output(
            get_fixture(
                subject_name="Mathematics",
                topic_name="Quadratic Equations",
                question_count=5,
            ),
            expected_count=5,
        )
    )
    orchestrator.start(session_factory=session_factory)

    try:
        teacher = await _login(client, "teacher@demo.local")
        student_a = await _login(client, "student-a@demo.local")
        student_b = await _login(client, "student-b@demo.local")

        created_class = await client.post(
            "/api/v1/classes/",
            json={"name": "Acceptance 9A", "grade": "9"},
            headers=teacher,
        )
        assert created_class.status_code == 200
        class_data = created_class.json()["data"]

        for headers in (student_a, student_b):
            joined = await client.post(
                "/api/v1/classes/join",
                json={"invite_code": class_data["invite_code"]},
                headers=headers,
            )
            assert joined.status_code == 200

        subject = await client.post(
            f"/api/v1/classes/{class_data['id']}/subjects",
            json={"name": "Mathematics"},
            headers=teacher,
        )
        assert subject.status_code == 200
        topic = await client.post(
            f"/api/v1/subjects/{subject.json()['data']['id']}/topics",
            json={"title": "Quadratic Equations", "difficulty": "MEDIUM"},
            headers=teacher,
        )
        assert topic.status_code == 200
        topic_id = topic.json()["data"]["id"]

        generated = await client.post(
            f"/api/v1/topics/{topic_id}/challenges/generate",
            json={"question_count": 5},
            headers=teacher,
        )
        assert generated.status_code == 200
        challenge_id = generated.json()["data"]["challenge_id"]

        for _ in range(100):
            challenge_status = await client.get(
                f"/api/v1/challenges/{challenge_id}/status", headers=teacher
            )
            assert challenge_status.status_code == 200
            if challenge_status.json()["data"]["status"] == "READY":
                break
            await asyncio.sleep(0.02)
        else:
            pytest.fail("AI challenge did not become READY")

        teacher_view = await client.get(f"/api/v1/challenges/{challenge_id}", headers=teacher)
        assert teacher_view.status_code == 200
        questions = teacher_view.json()["data"]["questions"]
        assert len(questions) == 5

        student_view = await client.get(f"/api/v1/challenges/{challenge_id}", headers=student_a)
        assert student_view.status_code == 200
        assert all(
            "is_correct" not in option
            for question in student_view.json()["data"]["questions"]
            for option in question["options"]
        )

        started_a = await client.post(
            f"/api/v1/challenges/{challenge_id}/attempts", headers=student_a
        )
        assert started_a.status_code == 200
        attempt_a = started_a.json()["data"]["attempt_id"]
        await _submit_answers(client, attempt_a, questions, student_a, correct=True)
        finished_a = await client.post(f"/api/v1/attempts/{attempt_a}/finish", headers=student_a)
        assert finished_a.status_code == 200
        assert finished_a.json()["data"]["total_xp"] > 0
        assert finished_a.json()["data"]["streak"] >= 1

        created_duel = await client.post(f"/api/v1/attempts/{attempt_a}/duels", headers=student_a)
        assert created_duel.status_code == 200
        duel_data = created_duel.json()["data"]

        accepted = await client.post(
            f"/api/v1/duels/code/{duel_data['share_code']}/accept",
            headers=student_b,
        )
        assert accepted.status_code == 200
        attempt_b = accepted.json()["data"]["opponent_attempt_id"]
        await _submit_answers(client, attempt_b, questions, student_b, correct=False)
        finished_b = await client.post(f"/api/v1/attempts/{attempt_b}/finish", headers=student_b)
        assert finished_b.status_code == 200

        duel = await client.get(f"/api/v1/duels/{duel_data['duel_id']}", headers=student_a)
        assert duel.status_code == 200
        assert duel.json()["data"]["status"] == "COMPLETED"
        assert duel.json()["data"]["winner_id"] is not None

        leaderboard = await client.get(
            f"/api/v1/classes/{class_data['id']}/leaderboard", headers=student_a
        )
        assert leaderboard.status_code == 200
        assert len(leaderboard.json()["data"]["entries"]) == 2

        dashboard = await client.get(
            f"/api/v1/teacher/classes/{class_data['id']}/dashboard", headers=teacher
        )
        assert dashboard.status_code == 200
        assert dashboard.json()["data"]["completed_attempts"] == 2
        assert dashboard.json()["data"]["recent_activity"]

        analytics = await client.get(
            f"/api/v1/teacher/topics/{topic_id}/analytics", headers=teacher
        )
        assert analytics.status_code == 200
        assert analytics.json()["data"]["attempts_count"] == 2
    finally:
        await orchestrator.close()
