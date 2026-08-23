from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from server.api.deps import CurrentUser, DbSession, require_roles
from server.api.mappers import challenge_detail_to_out, challenge_to_out
from server.api.schemas import ChallengeGenerateBody, ChallengeStatusUpdateBody
from server.core.cache import get_cache
from server.core.enums import (
    AiJobStatus,
    ChallengeOrigin,
    ChallengeStatus,
    ChallengeType,
    EntityStatus,
    UserRole,
)
from server.core.errors import ERROR_CODES, AppError, success_response
from server.core.settings import get_settings
from server.db.session import get_session_factory
from server.models.entities import AiGenerationJob, Challenge, Question, Subject, Topic, User
from server.services.domain import MembershipService
from server.services.orchestrator import get_orchestrator

router = APIRouter(tags=["challenges"])
Teacher = Annotated[CurrentUser, require_roles(UserRole.TEACHER, UserRole.ADMIN)]


@router.get("/topics/{topic_id}/challenges")
async def list_challenges(topic_id: str, user: CurrentUser, db: DbSession):
    topic = await _get_topic_with_access(db, user, topic_id)
    result = await db.execute(
        select(Challenge).where(
            Challenge.topic_id == topic.id,
            Challenge.status != ChallengeStatus.ARCHIVED,
        )
    )
    return success_response([challenge_to_out(c) for c in result.scalars().all()])


@router.post("/topics/{topic_id}/challenges/generate")
async def generate_challenge(
    topic_id: str,
    body: ChallengeGenerateBody,
    user: CurrentUser,
    db: DbSession,
):
    topic = await _get_topic_with_access(db, user, topic_id)
    settings = get_settings()
    cache = get_cache()

    active_key = f"ai:active:{user.id}"
    active_count = await cache.incr(active_key, ttl=3600)
    if active_count > settings.redis_ai_generation_limit_per_user:
        raise AppError(
            ERROR_CODES.AI_GENERATION_LIMIT,
            "Too many active AI generation jobs",
            status_code=429,
        )

    question_count = body.question_count or settings.demo_question_count
    challenge = Challenge(
        topic_id=topic.id,
        created_by_id=user.id,
        origin=ChallengeOrigin.AI,
        type=ChallengeType.AI_PRACTICE,
        title=f"AI Practice: {topic.title}",
        difficulty=body.difficulty or topic.difficulty,
        question_count=question_count,
        status=ChallengeStatus.PENDING,
    )
    db.add(challenge)
    await db.flush()

    job = AiGenerationJob(
        challenge_id=challenge.id,
        requested_by_id=user.id,
        status=AiJobStatus.PENDING,
    )
    db.add(job)
    await db.flush()

    get_orchestrator().schedule(job_id=job.id, session_factory=get_session_factory())
    return success_response(
        {"challenge_id": challenge.id, "job_id": job.id, "status": challenge.status}
    )


@router.get("/challenges/{challenge_id}/status")
async def challenge_status(challenge_id: str, user: CurrentUser, db: DbSession):
    challenge = await _get_challenge_with_access(db, user, challenge_id)
    job_result = await db.execute(
        select(AiGenerationJob).where(AiGenerationJob.challenge_id == challenge.id)
    )
    job = job_result.scalar_one_or_none()
    return success_response(
        {
            "challenge_id": challenge.id,
            "status": challenge.status,
            "generation_error": challenge.generation_error,
            "job_status": job.status if job else None,
        }
    )


@router.get("/challenges/{challenge_id}")
async def get_challenge(challenge_id: str, user: CurrentUser, db: DbSession):
    challenge = await _get_challenge_with_access(db, user, challenge_id, load_questions=True)
    if challenge.status != ChallengeStatus.READY:
        raise AppError(ERROR_CODES.CHALLENGE_NOT_READY, "Challenge not ready", status_code=409)
    include_correct = user.role in (UserRole.TEACHER, UserRole.ADMIN)
    return success_response(challenge_detail_to_out(challenge, include_correct=include_correct))


@router.patch("/challenges/{challenge_id}/status")
async def update_challenge_status(
    challenge_id: str,
    body: ChallengeStatusUpdateBody,
    user: Teacher,
    db: DbSession,
):
    challenge = await _get_challenge_with_access(db, user, challenge_id)
    challenge.status = body.status
    await db.flush()
    return success_response(challenge_to_out(challenge))


async def _get_topic_with_access(db, user: User, topic_id: str) -> Topic:
    topic = await db.get(Topic, topic_id)
    if topic is None or topic.status != EntityStatus.ACTIVE:
        raise AppError(ERROR_CODES.TOPIC_NOT_FOUND, "Topic not found", status_code=404)
    subject = await db.get(Subject, topic.subject_id)
    if subject is None:
        raise AppError(ERROR_CODES.SUBJECT_NOT_FOUND, "Subject not found", status_code=404)
    await MembershipService(db).get_class_for_user(user, subject.class_id)
    return topic


async def _get_challenge_with_access(
    db, user: User, challenge_id: str, *, load_questions: bool = False
) -> Challenge:
    options = [selectinload(Challenge.topic).selectinload(Topic.subject)]
    if load_questions:
        options.append(selectinload(Challenge.questions).selectinload(Question.options))
    result = await db.execute(
        select(Challenge).where(Challenge.id == challenge_id).options(*options)
    )
    challenge = result.scalar_one_or_none()
    if challenge is None:
        raise AppError(ERROR_CODES.CHALLENGE_NOT_FOUND, "Challenge not found", status_code=404)
    subject = challenge.topic.subject if challenge.topic else None
    if subject is None:
        raise AppError(ERROR_CODES.CHALLENGE_ACCESS_DENIED, "Access denied", status_code=403)
    await MembershipService(db).get_class_for_user(user, subject.class_id)
    return challenge
