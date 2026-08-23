from __future__ import annotations

import asyncio
from datetime import timedelta

import structlog
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from server.ai.client import AgentRouterClient
from server.core.cache import get_cache
from server.core.enums import AiJobStatus, ChallengeStatus
from server.core.errors import ERROR_CODES, AppError
from server.core.settings import get_settings
from server.models.entities import (
    AiGenerationJob,
    Challenge,
    Question,
    QuestionOption,
    Topic,
    utcnow,
)

logger = structlog.get_logger(__name__)

AI_PROVIDER_NAME = "agentrouter"


class AiOrchestrator:
    """Background AI generation with concurrency limits."""

    def __init__(self) -> None:
        self._semaphore = asyncio.Semaphore(get_settings().max_concurrent_ai_jobs)
        self._tasks: set[asyncio.Task] = set()
        self._worker_task: asyncio.Task | None = None
        self._client = AgentRouterClient()

    def start(self, *, session_factory) -> None:
        if self._worker_task is None or self._worker_task.done():
            self._worker_task = asyncio.create_task(self._worker_loop(session_factory))

    @property
    def is_running(self) -> bool:
        return self._worker_task is not None and not self._worker_task.done()

    async def close(self) -> None:
        if self._worker_task is not None:
            self._worker_task.cancel()
            await asyncio.gather(self._worker_task, return_exceptions=True)
            self._worker_task = None
        for task in list(self._tasks):
            task.cancel()
        if self._tasks:
            await asyncio.gather(*self._tasks, return_exceptions=True)
        await self._client.close()

    def schedule(self, *, job_id: str, session_factory) -> None:
        task = asyncio.create_task(self._run_job(job_id=job_id, session_factory=session_factory))
        self._tasks.add(task)
        task.add_done_callback(self._tasks.discard)

    async def _worker_loop(self, session_factory) -> None:
        settings = get_settings()
        while True:
            try:
                await self._recover_abandoned_jobs(session_factory)
                job_ids = await self._claim_pending_jobs(session_factory)
                for job_id in job_ids:
                    self.schedule(job_id=job_id, session_factory=session_factory)
            except asyncio.CancelledError:
                raise
            except Exception:
                # A transient database outage must not permanently kill the worker.
                logger.exception("ai_worker_poll_failed")
            await asyncio.sleep(settings.ai_job_poll_interval_seconds)

    async def _claim_pending_jobs(self, session_factory) -> list[str]:
        available = max(0, get_settings().max_concurrent_ai_jobs - len(self._tasks))
        if available == 0:
            return []
        async with session_factory() as session:
            result = await session.execute(
                select(AiGenerationJob)
                .where(AiGenerationJob.status == AiJobStatus.PENDING)
                .order_by(AiGenerationJob.created_at)
                .limit(available)
                .with_for_update(skip_locked=True)
            )
            jobs = result.scalars().all()
            now = utcnow()
            for job in jobs:
                job.status = AiJobStatus.PROCESSING
                job.started_at = now
            await session.commit()
            return [job.id for job in jobs]

    async def _recover_abandoned_jobs(self, session_factory) -> None:
        cutoff = utcnow() - timedelta(minutes=30)
        async with session_factory() as session:
            await session.execute(
                update(AiGenerationJob)
                .where(
                    AiGenerationJob.status == AiJobStatus.PROCESSING,
                    AiGenerationJob.started_at < cutoff,
                )
                .values(status=AiJobStatus.PENDING, started_at=None)
            )
            await session.commit()

    async def _run_job(self, *, job_id: str, session_factory) -> None:
        user_id: str | None = None
        terminal_committed = False
        try:
            async with self._semaphore, session_factory() as session:
                job = await session.get(AiGenerationJob, job_id)
                user_id = job.requested_by_id if job else None
                user_id = await self._process_job(session, job_id)
                await session.commit()
                terminal_committed = True
        except asyncio.CancelledError:
            async with session_factory() as session:
                job = await session.get(AiGenerationJob, job_id)
                if job is not None and job.status == AiJobStatus.PROCESSING:
                    job.status = AiJobStatus.PENDING
                    job.started_at = None
                    await session.commit()
            raise
        except Exception:
            # Keep PROCESSING jobs and their reserved active slot recoverable. The
            # periodic stale-job recovery will safely return them to the queue.
            logger.exception("ai_job_worker_failed", job_id=job_id)
        finally:
            if terminal_committed and user_id is not None:
                await self._release_ai_slot(user_id)

    async def _release_ai_slot(self, user_id: str) -> None:
        await get_cache().decr(f"ai:active:{user_id}")

    async def _process_job(self, session: AsyncSession, job_id: str) -> str | None:
        job = await session.get(AiGenerationJob, job_id)
        if job is None or job.status not in (AiJobStatus.PENDING, AiJobStatus.PROCESSING):
            return job.requested_by_id if job else None

        job.status = AiJobStatus.PROCESSING
        job.provider = AI_PROVIDER_NAME
        job.started_at = utcnow()
        challenge = await session.get(
            Challenge,
            job.challenge_id,
            options=[selectinload(Challenge.topic).selectinload(Topic.subject)],
        )
        if challenge is None:
            job.status = AiJobStatus.FAILED
            job.error_code = ERROR_CODES.CHALLENGE_NOT_FOUND
            job.error_message = "Challenge not found"
            job.completed_at = utcnow()
            return job.requested_by_id

        challenge.status = ChallengeStatus.PROCESSING
        await session.flush()

        topic = challenge.topic
        subject_name = topic.subject.name if topic and topic.subject else "General"

        try:
            result = await self._client.generate_challenge(
                subject=subject_name,
                topic=topic.title,
                description=topic.description or topic.source_context,
                difficulty=challenge.difficulty,
                question_count=challenge.question_count,
            )

            challenge.title = result["title"]
            for idx, q_data in enumerate(result["questions"]):
                question = Question(
                    challenge_id=challenge.id,
                    order=idx + 1,
                    type=q_data["type"],
                    prompt=q_data["prompt"],
                    explanation=q_data.get("explanation"),
                    points=q_data.get("points", 1),
                )
                session.add(question)
                await session.flush()
                for opt_idx, opt in enumerate(q_data["options"]):
                    session.add(
                        QuestionOption(
                            question_id=question.id,
                            order=opt_idx + 1,
                            text=opt["text"],
                            is_correct=opt["is_correct"],
                        )
                    )

            challenge.status = ChallengeStatus.READY
            challenge.published_at = utcnow()
            job.status = AiJobStatus.COMPLETED
            job.completed_at = utcnow()
            job.error_code = None
            job.error_message = None
        except AppError as exc:
            logger.warning("ai_job_failed", job_id=job_id, error_code=exc.code)
            challenge.status = ChallengeStatus.FAILED
            challenge.generation_error = exc.message
            job.status = AiJobStatus.FAILED
            job.error_code = exc.code
            job.error_message = exc.message
            job.retry_count += 1
            job.completed_at = utcnow()
        except Exception as exc:
            logger.exception("ai_job_failed", job_id=job_id)
            challenge.status = ChallengeStatus.FAILED
            challenge.generation_error = str(exc)
            job.status = AiJobStatus.FAILED
            job.error_code = ERROR_CODES.AI_PROVIDER_UNAVAILABLE
            job.error_message = str(exc)
            job.retry_count += 1
            job.completed_at = utcnow()

        return job.requested_by_id


_orchestrator: AiOrchestrator | None = None


def get_orchestrator() -> AiOrchestrator:
    global _orchestrator
    if _orchestrator is None:
        _orchestrator = AiOrchestrator()
    return _orchestrator


def reset_orchestrator() -> None:
    global _orchestrator
    _orchestrator = None
