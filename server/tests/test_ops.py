from __future__ import annotations

import asyncio
from datetime import timedelta
from types import SimpleNamespace
from unittest.mock import patch

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from server.core.cache import CacheBackend, get_cache, reset_cache
from server.core.enums import AiJobStatus
from server.core.settings import Settings
from server.db.base import Base
from server.models.entities import AiGenerationJob, utcnow
from server.services.orchestrator import AiOrchestrator


@pytest.mark.asyncio
async def test_generation_quota_is_atomic_and_rollback_restores_both_counters():
    cache = CacheBackend(Settings(redis_url=None))

    result = await cache.acquire_generation_quota(
        "active:user",
        "daily:user",
        active_limit=1,
        daily_limit=2,
    )
    assert result == "acquired"
    assert (
        await cache.acquire_generation_quota(
            "active:user",
            "daily:user",
            active_limit=1,
            daily_limit=2,
        )
        == "active"
    )

    await cache.rollback_generation_quota("active:user", "daily:user")
    assert await cache.get("active:user") is None
    assert await cache.get("daily:user") is None


@pytest.mark.asyncio
async def test_readiness_returns_503_when_worker_is_not_running(client: AsyncClient):
    with patch(
        "server.api.routes.health.get_orchestrator",
        return_value=SimpleNamespace(is_running=False),
    ):
        response = await client.get("/api/v1/ready")

    assert response.status_code == 503
    assert response.json()["data"]["checks"]["worker"] == "error"


@pytest.mark.asyncio
async def test_worker_claims_pending_and_recovers_stale_jobs():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    orchestrator = AiOrchestrator()

    async with factory() as session:
        pending = AiGenerationJob(
            challenge_id="challenge-pending",
            requested_by_id="user-pending",
            status=AiJobStatus.PENDING,
        )
        stale = AiGenerationJob(
            challenge_id="challenge-stale",
            requested_by_id="user-stale",
            status=AiJobStatus.PROCESSING,
            started_at=utcnow() - timedelta(hours=1),
        )
        session.add_all([pending, stale])
        await session.commit()
        pending_id = pending.id
        stale_id = stale.id

    claimed = await orchestrator._claim_pending_jobs(factory)
    assert claimed == [pending_id]
    await orchestrator._recover_abandoned_jobs(factory)

    async with factory() as session:
        recovered = await session.get(AiGenerationJob, stale_id)
        assert recovered.status == AiJobStatus.PENDING
        assert recovered.started_at is None

    await orchestrator.close()
    await engine.dispose()


@pytest.mark.asyncio
async def test_cancelling_job_requeues_without_releasing_active_slot():
    reset_cache()
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    orchestrator = AiOrchestrator()
    started = asyncio.Event()

    async with factory() as session:
        job = AiGenerationJob(
            challenge_id="challenge-cancelled",
            requested_by_id="user-cancelled",
            status=AiJobStatus.PROCESSING,
            started_at=utcnow(),
        )
        session.add(job)
        await session.commit()
        job_id = job.id

    async def wait_forever(_session, _job_id):
        started.set()
        await asyncio.Event().wait()

    await get_cache().set("ai:active:user-cancelled", 1, ttl=3600)
    with patch.object(orchestrator, "_process_job", side_effect=wait_forever):
        task = asyncio.create_task(orchestrator._run_job(job_id=job_id, session_factory=factory))
        await started.wait()
        task.cancel()
        with pytest.raises(asyncio.CancelledError):
            await task

    assert await get_cache().get("ai:active:user-cancelled") == 1
    async with factory() as session:
        job = await session.get(AiGenerationJob, job_id)
        assert job.status == AiJobStatus.PENDING

    await orchestrator.close()
    await engine.dispose()
