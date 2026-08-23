from __future__ import annotations

import json
from typing import Annotated

from fastapi import APIRouter
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from server.api.deps import CurrentUser, DbSession, require_roles
from server.api.mappers import challenge_detail_to_out, challenge_to_out
from server.api.schemas import (
    ChallengeGenerateBody,
    ChallengeManualBody,
    ChallengeStatusUpdateBody,
)
from server.core.cache import get_cache
from server.core.enums import (
    ActivityEventType,
    AiJobStatus,
    ChallengeOrigin,
    ChallengeStatus,
    ChallengeType,
    EntityStatus,
    UserRole,
)
from server.core.errors import ERROR_CODES, AppError, success_response
from server.core.settings import get_settings
from server.models.entities import (
    ActivityEvent,
    AiGenerationJob,
    Challenge,
    Question,
    QuestionOption,
    Subject,
    Topic,
)
from server.services.domain import MembershipService

router = APIRouter(tags=["challenges"])
StudentOrTeacher = Annotated[CurrentUser, require_roles(UserRole.STUDENT, UserRole.TEACHER)]
Teacher = Annotated[CurrentUser, require_roles(UserRole.TEACHER, UserRole.ADMIN)]


async def _topic_with_access(db: DbSession, user: CurrentUser, topic_id: str) -> Topic:
    topic = await db.get(Topic, topic_id)
    if topic is None or topic.status != EntityStatus.ACTIVE:
        raise AppError(ERROR_CODES.TOPIC_NOT_FOUND, "Topic not found", status_code=404)
    subject = await db.get(Subject, topic.subject_id)
    if subject is None:
        raise AppError(ERROR_CODES.SUBJECT_NOT_FOUND, "Subject not found", status_code=404)
    await MembershipService(db).get_class_for_user(user, subject.class_id)
    return topic


@router.get("/topics/{topic_id}/challenges")
async def list_challenges(topic_id: str, user: CurrentUser, db: DbSession):
    await _topic_with_access(db, user, topic_id)
    query = select(Challenge).where(Challenge.topic_id == topic_id)
    if user.role == UserRole.STUDENT:
        query = query.where(Challenge.status == ChallengeStatus.READY)
    result = await db.execute(query.order_by(Challenge.created_at.desc()))
    return success_response([challenge_to_out(c) for c in result.scalars().all()])


@router.post("/topics/{topic_id}/challenges/generate")
async def generate_challenge(
    topic_id: str,
    body: ChallengeGenerateBody,
    user: StudentOrTeacher,
    db: DbSession,
):
    settings = get_settings()
    topic = await _topic_with_access(db, user, topic_id)
    subject = await db.get(Subject, topic.subject_id)
    if subject is None:
        raise AppError(ERROR_CODES.SUBJECT_NOT_FOUND, "Subject not found", status_code=404)
    question_count = body.question_count or settings.demo_question_count
    class_id = subject.class_id

    cache = get_cache()
    active_key = f"ai:active:{user.id}"
    daily_key = f"ai:daily:{user.id}"
    quota = await cache.acquire_generation_quota(
        active_key,
        daily_key,
        active_limit=settings.redis_ai_generation_limit_per_user,
        daily_limit=settings.ai_generation_daily_limit_per_user,
    )
    if quota == "active":
        raise AppError(
            ERROR_CODES.AI_GENERATION_LIMIT,
            "Too many active AI generations",
            status_code=429,
        )
    if quota == "daily":
        raise AppError(
            ERROR_CODES.AI_GENERATION_LIMIT,
            "Daily AI generation limit reached",
            status_code=429,
        )

    try:
        challenge = Challenge(
            topic_id=topic.id,
            created_by_id=user.id,
            origin=ChallengeOrigin.AI,
            type=ChallengeType.AI_PRACTICE,
            title=f"{topic.title} Practice",
            difficulty=body.difficulty or topic.difficulty,
            question_count=question_count,
            status=ChallengeStatus.PENDING,
        )
        db.add(challenge)
        await db.flush()
        db.add(
            AiGenerationJob(
                challenge_id=challenge.id,
                requested_by_id=user.id,
                status=AiJobStatus.PENDING,
            )
        )
        if class_id is not None:
            db.add(
                ActivityEvent(
                    class_id=class_id,
                    user_id=user.id,
                    event_type=ActivityEventType.CHALLENGE_CREATED,
                    entity_type="challenge",
                    entity_id=challenge.id,
                    payload=json.dumps({"challengeId": challenge.id, "topicId": topic.id}),
                )
            )
        # The durable poller only observes fully committed jobs.
        await db.commit()
    except Exception:
        await db.rollback()
        await cache.rollback_generation_quota(active_key, daily_key)
        raise
    return success_response({"challenge_id": challenge.id, "status": challenge.status})


@router.get("/challenges/{challenge_id}/status")
async def challenge_status(challenge_id: str, user: CurrentUser, db: DbSession):
    challenge = await db.get(Challenge, challenge_id, options=[selectinload(Challenge.topic)])
    if challenge is None:
        raise AppError(ERROR_CODES.CHALLENGE_NOT_FOUND, "Challenge not found", status_code=404)
    subject = await db.get(Subject, challenge.topic.subject_id)
    if subject:
        await MembershipService(db).get_class_for_user(user, subject.class_id)
        if user.role == UserRole.TEACHER:
            await MembershipService(db).ensure_class_teacher(user, subject.class_id)
    return success_response(
        {
            "challenge_id": challenge.id,
            "status": challenge.status,
            "generation_error": challenge.generation_error,
        }
    )


@router.get("/challenges/{challenge_id}")
async def get_challenge(challenge_id: str, user: CurrentUser, db: DbSession):
    challenge = await db.get(
        Challenge,
        challenge_id,
        options=[
            selectinload(Challenge.topic),
            selectinload(Challenge.questions).selectinload(Question.options),
        ],
    )
    if challenge is None:
        raise AppError(ERROR_CODES.CHALLENGE_NOT_FOUND, "Challenge not found", status_code=404)
    subject = await db.get(Subject, challenge.topic.subject_id)
    if subject:
        await MembershipService(db).get_class_for_user(user, subject.class_id)
        if user.role == UserRole.TEACHER:
            await MembershipService(db).ensure_class_teacher(user, subject.class_id)
    include_correct = user.role in (UserRole.TEACHER, UserRole.ADMIN)
    return success_response(challenge_detail_to_out(challenge, include_correct=include_correct))


@router.post("/topics/{topic_id}/challenges")
async def create_manual_challenge(
    topic_id: str,
    body: ChallengeManualBody,
    user: Teacher,
    db: DbSession,
):
    topic = await _topic_with_access(db, user, topic_id)
    subject = await db.get(Subject, topic.subject_id)
    if subject is None:
        raise AppError(ERROR_CODES.SUBJECT_NOT_FOUND, "Subject not found", status_code=404)
    await MembershipService(db).ensure_class_teacher(user, subject.class_id)
    challenge = Challenge(
        topic_id=topic.id,
        created_by_id=user.id,
        origin=ChallengeOrigin.TEACHER,
        type=ChallengeType.TEACHER_ASSIGNMENT,
        title=body.title,
        difficulty=body.difficulty,
        question_count=len(body.questions),
        status=ChallengeStatus.READY,
    )
    db.add(challenge)
    await db.flush()

    for idx, q_data in enumerate(body.questions):
        correct_count = sum(1 for option in q_data.options if option.is_correct)
        if correct_count != 1:
            raise AppError(
                ERROR_CODES.INVALID_CORRECT_OPTION_COUNT,
                "Each question must have exactly one correct option",
            )
        question = Question(
            challenge_id=challenge.id,
            order=idx + 1,
            type=q_data.type,
            prompt=q_data.prompt,
            explanation=q_data.explanation,
            points=q_data.points,
        )
        db.add(question)
        await db.flush()
        for opt_idx, option in enumerate(q_data.options):
            db.add(
                QuestionOption(
                    question_id=question.id,
                    order=opt_idx + 1,
                    text=option.text,
                    is_correct=option.is_correct,
                )
            )
    await db.flush()
    await db.refresh(challenge, attribute_names=["questions"])
    for q in challenge.questions:
        await db.refresh(q, attribute_names=["options"])
    return success_response(challenge_detail_to_out(challenge, include_correct=True))


@router.patch("/challenges/{challenge_id}/status")
async def update_challenge_status(
    challenge_id: str,
    body: ChallengeStatusUpdateBody,
    user: Teacher,
    db: DbSession,
):
    challenge = await db.get(Challenge, challenge_id, options=[selectinload(Challenge.topic)])
    if challenge is None:
        raise AppError(ERROR_CODES.CHALLENGE_NOT_FOUND, "Challenge not found", status_code=404)
    subject = await db.get(Subject, challenge.topic.subject_id)
    if subject:
        await MembershipService(db).ensure_class_teacher(user, subject.class_id)
    if body.status not in (ChallengeStatus.READY, ChallengeStatus.ARCHIVED):
        raise AppError(ERROR_CODES.VALIDATION_ERROR, "Invalid status transition")
    challenge.status = body.status
    await db.flush()
    return success_response({"id": challenge.id, "status": challenge.status})
