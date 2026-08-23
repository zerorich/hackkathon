from __future__ import annotations

import asyncio
from unittest.mock import AsyncMock, patch

import pytest
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from server.core.cache import get_cache, reset_cache
from server.core.enums import AiJobStatus, ChallengeStatus
from server.core.settings import Settings
from server.db.base import Base
from server.models.entities import AiGenerationJob, Challenge, Subject, Topic, User
from server.services.orchestrator import AI_PROVIDER_NAME, AiOrchestrator


@pytest.mark.asyncio
async def test_orchestrator_respects_concurrency_limit():
    settings = Settings(max_concurrent_ai_jobs=1)
    orchestrator = AiOrchestrator()
    orchestrator._semaphore = asyncio.Semaphore(settings.max_concurrent_ai_jobs)

    active = 0
    max_active = 0
    lock = asyncio.Lock()

    async def slow_process(session, job_id):
        nonlocal active, max_active
        async with lock:
            active += 1
            max_active = max(max_active, active)
        await asyncio.sleep(0.05)
        async with lock:
            active -= 1
        return "user-id"

    with patch.object(orchestrator, "_process_job", side_effect=slow_process):
        engine = create_async_engine("sqlite+aiosqlite:///:memory:")
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

        async with factory() as session:
            from server.models.entities import SchoolClass

            user = User(identifier="t@test.local", display_name="T", role="TEACHER")
            session.add(user)
            await session.flush()
            cls = SchoolClass(name="9C", grade="9", created_by_id=user.id)
            session.add(cls)
            await session.flush()
            subject = Subject(class_id=cls.id, name="Math", created_by_id=user.id)
            session.add(subject)
            await session.flush()
            topic = Topic(subject_id=subject.id, title="T", created_by_id=user.id)
            session.add(topic)
            await session.flush()
            jobs = []
            for _ in range(3):
                ch = Challenge(
                    topic_id=topic.id,
                    title="Pending",
                    status=ChallengeStatus.PENDING,
                    question_count=5,
                )
                session.add(ch)
                await session.flush()
                job = AiGenerationJob(
                    challenge_id=ch.id,
                    requested_by_id=user.id,
                    status=AiJobStatus.PENDING,
                )
                session.add(job)
                jobs.append(job)
            await session.commit()

        tasks = [
            asyncio.create_task(orchestrator._run_job(job_id=j.id, session_factory=factory))
            for j in jobs
        ]
        await asyncio.gather(*tasks)
        assert max_active <= settings.max_concurrent_ai_jobs

    await engine.dispose()


@pytest.mark.asyncio
async def test_orchestrator_processes_job_with_mocked_ai():
    fixture = {
        "title": "Generated",
        "questions": [
            {
                "prompt": f"Question {i}?",
                "type": "TRUE_FALSE",
                "explanation": "E",
                "points": 1,
                "options": [
                    {"text": "True", "is_correct": True},
                    {"text": "False", "is_correct": False},
                ],
            }
            for i in range(5)
        ],
    }

    reset_cache()
    orchestrator = AiOrchestrator()
    orchestrator._client.generate_challenge = AsyncMock(return_value=fixture)

    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with factory() as session:
        user = User(identifier="t2@test.local", display_name="T2", role="TEACHER")
        session.add(user)
        await session.flush()
        from server.models.entities import SchoolClass

        cls = SchoolClass(name="9B", grade="9", created_by_id=user.id)
        session.add(cls)
        await session.flush()
        subject = Subject(class_id=cls.id, name="Math", created_by_id=user.id)
        session.add(subject)
        await session.flush()
        topic = Topic(subject_id=subject.id, title="Algebra", created_by_id=user.id)
        session.add(topic)
        await session.flush()
        challenge = Challenge(
            topic_id=topic.id,
            title="Pending",
            status=ChallengeStatus.PENDING,
            question_count=5,
        )
        session.add(challenge)
        await session.flush()
        job = AiGenerationJob(
            challenge_id=challenge.id,
            requested_by_id=user.id,
            status=AiJobStatus.PENDING,
        )
        session.add(job)
        await session.commit()
        job_id = job.id
        challenge_id = challenge.id

    cache = get_cache()
    await cache.set(f"ai:active:{user.id}", 1, ttl=3600)

    await orchestrator._run_job(job_id=job_id, session_factory=factory)

    async with factory() as session:
        challenge = await session.get(Challenge, challenge_id)
        assert challenge.status == ChallengeStatus.READY
        assert challenge.title == "Generated"
        job = await session.get(AiGenerationJob, job_id)
        assert job.status == AiJobStatus.COMPLETED
        assert job.provider == AI_PROVIDER_NAME
        assert job.started_at is not None
        assert job.completed_at is not None

    active = await cache.get(f"ai:active:{user.id}")
    assert active is None or int(active) == 0

    await engine.dispose()


@pytest.mark.asyncio
async def test_orchestrator_releases_slot_on_failure():
    reset_cache()
    orchestrator = AiOrchestrator()
    orchestrator._client.generate_challenge = AsyncMock(side_effect=RuntimeError("provider down"))

    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with factory() as session:
        user = User(identifier="t3@test.local", display_name="T3", role="TEACHER")
        session.add(user)
        await session.flush()
        from server.models.entities import SchoolClass

        cls = SchoolClass(name="9D", grade="9", created_by_id=user.id)
        session.add(cls)
        await session.flush()
        subject = Subject(class_id=cls.id, name="Math", created_by_id=user.id)
        session.add(subject)
        await session.flush()
        topic = Topic(subject_id=subject.id, title="Frac", created_by_id=user.id)
        session.add(topic)
        await session.flush()
        challenge = Challenge(
            topic_id=topic.id,
            title="Pending",
            status=ChallengeStatus.PENDING,
            question_count=5,
        )
        session.add(challenge)
        await session.flush()
        job = AiGenerationJob(
            challenge_id=challenge.id,
            requested_by_id=user.id,
            status=AiJobStatus.PENDING,
        )
        session.add(job)
        await session.commit()
        job_id = job.id
        user_id = user.id

    cache = get_cache()
    await cache.set(f"ai:active:{user_id}", 2, ttl=3600)

    await orchestrator._run_job(job_id=job_id, session_factory=factory)

    async with factory() as session:
        job = await session.get(AiGenerationJob, job_id)
        assert job.status == AiJobStatus.FAILED
        assert job.error_code is not None
        assert job.started_at is not None

    assert int(await cache.get(f"ai:active:{user_id}") or 0) == 1

    await engine.dispose()
