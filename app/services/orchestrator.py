from __future__ import annotations

import asyncio
from typing import TYPE_CHECKING

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.ai.client import AgentRouterClient
from app.core.cache import get_cache
from app.core.enums import AiJobStatus, ChallengeStatus
from app.core.errors import AppError, ERROR_CODES
from app.core.settings import get_settings
from app.models.entities import AiGenerationJob, Challenge, Question, QuestionOption, Topic, utcnow

if TYPE_CHECKING:
    pass

logger = structlog.get_logger(__name__)

AI_PROVIDER_NAME = "agentrouter"


class AiOrchestrator:
    """Background AI generation with concurrency limits."""

    def __init__(self) -> None:
        self._semaphore = asyncio.Semaphore(get_settings().max_concurrent_ai_jobs)
        self._tasks: set[asyncio.Task] = set()
        self._client = AgentRouterClient()

    async def close(self) -> None:
        for task in list(self._tasks):
            task.cancel()
        if self._tasks:
            await asyncio.gather(*self._tasks, return_exceptions=True)
        await self._client.close()

    def schedule(self, *, job_id: str, session_factory) -> None:
        task = asyncio.create_task(self._run_job(job_id=job_id, session_factory=session_factory))
        self._tasks.add(task)
        task.add_done_callback(self._tasks.discard)

    async def _run_job(self, *, job_id: str, session_factory) -> None:
        user_id: str | None = None
        try:
            async with self._semaphore:
                async with session_factory() as session:
                    user_id = await self._process_job(session, job_id)
                    await session.commit()
        finally:
            if user_id is not None:
                await self._release_ai_slot(user_id)

    async def _release_ai_slot(self, user_id: str) -> None:
        cache = get_cache()
        active_key = f"ai:active:{user_id}"
        active = await cache.get(active_key) or 0
        new_val = max(0, int(active) - 1)
        if new_val == 0:
            await cache.delete(active_key)
        else:
            await cache.set(active_key, new_val, ttl=3600)

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
