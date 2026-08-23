from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload

from server.api.deps import CurrentUser, DbSession, require_roles
from server.api.mappers import (
    attempt_finish_stats_out,
    attempt_result_to_out,
    attempt_to_out,
    challenge_detail_to_out,
)
from server.api.schemas import AnswerBody
from server.core.enums import AttemptStatus, ChallengeStatus, EntityStatus, UserRole
from server.core.errors import ERROR_CODES, AppError, success_response
from server.core.settings import get_settings
from server.db.concurrency import advisory_lock, integrity_savepoint
from server.models.entities import (
    Attempt,
    AttemptAnswer,
    Challenge,
    Duel,
    Question,
    QuestionOption,
    StudentStats,
    Subject,
    Topic,
    duel_expires_at,
)
from server.services.domain import AttemptService, DuelService, MembershipService

router = APIRouter(tags=["attempts"])
Student = Annotated[CurrentUser, require_roles(UserRole.STUDENT)]


async def _load_attempt(db: DbSession, attempt_id: str) -> Attempt:
    attempt = await db.get(
        Attempt,
        attempt_id,
        options=[
            selectinload(Attempt.challenge)
            .selectinload(Challenge.topic)
            .selectinload(Topic.subject),
            selectinload(Attempt.challenge)
            .selectinload(Challenge.questions)
            .selectinload(Question.options),
            selectinload(Attempt.answers),
        ],
    )
    if attempt is None:
        raise AppError(ERROR_CODES.ATTEMPT_NOT_FOUND, "Attempt not found", status_code=404)
    return attempt


@router.post("/challenges/{challenge_id}/attempts")
async def start_attempt(challenge_id: str, user: Student, db: DbSession):
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
    if challenge.status != ChallengeStatus.READY:
        raise AppError(ERROR_CODES.CHALLENGE_NOT_READY, "Challenge is not ready", status_code=409)

    topic = await db.get(Topic, challenge.topic_id)
    if topic is None or topic.status == EntityStatus.ARCHIVED:
        raise AppError(ERROR_CODES.TOPIC_ARCHIVED, "Topic is archived", status_code=410)

    subject = await db.get(Subject, challenge.topic.subject_id)
    if subject is None:
        raise AppError(ERROR_CODES.SUBJECT_NOT_FOUND, "Subject not found", status_code=404)
    if subject.status == EntityStatus.ARCHIVED:
        raise AppError(ERROR_CODES.CHALLENGE_ARCHIVED, "Subject is archived", status_code=410)
    await MembershipService(db).get_class_for_user(user, subject.class_id)

    attempt = Attempt(
        challenge_id=challenge.id,
        user_id=user.id,
        class_id=subject.class_id,
        status=AttemptStatus.IN_PROGRESS,
    )
    db.add(attempt)
    await db.flush()
    return success_response(
        {
            "attempt_id": attempt.id,
            "started_at": attempt.started_at,
            "challenge": challenge_detail_to_out(challenge, include_correct=False),
        }
    )


@router.get("/attempts/{attempt_id}")
async def get_attempt(attempt_id: str, user: CurrentUser, db: DbSession):
    attempt = await _load_attempt(db, attempt_id)
    if attempt.user_id != user.id:
        if user.role == UserRole.ADMIN:
            pass
        elif user.role == UserRole.TEACHER:
            await MembershipService(db).ensure_class_teacher(user, attempt.class_id)
        else:
            raise AppError(ERROR_CODES.FORBIDDEN, "Not allowed", status_code=403)
    include_correct = attempt.status == AttemptStatus.COMPLETED or user.role in (
        UserRole.TEACHER,
        UserRole.ADMIN,
    )
    if include_correct:
        return success_response(
            attempt_result_to_out(
                attempt,
                questions=attempt.challenge.questions,
                answers=attempt.answers,
            )
        )
    return success_response(attempt_to_out(attempt))


@router.put("/attempts/{attempt_id}/answers/{question_id}")
async def submit_answer(
    attempt_id: str,
    question_id: str,
    body: AnswerBody,
    user: Student,
    db: DbSession,
):
    attempt = await _load_attempt(db, attempt_id)
    await advisory_lock(db, f"attempt:finish:{attempt_id}")
    await db.execute(select(Attempt).where(Attempt.id == attempt_id).with_for_update())
    await db.refresh(attempt, attribute_names=["status"])
    if attempt.user_id != user.id:
        raise AppError(ERROR_CODES.FORBIDDEN, "Not your attempt", status_code=403)
    if attempt.status != AttemptStatus.IN_PROGRESS:
        raise AppError(ERROR_CODES.ATTEMPT_ALREADY_COMPLETED, "Attempt already completed")

    question_ids = {q.id for q in attempt.challenge.questions}
    if question_id not in question_ids:
        raise AppError(ERROR_CODES.QUESTION_NOT_IN_CHALLENGE, "Question not in challenge")

    option = await db.get(QuestionOption, body.selected_option_id)
    if option is None or option.question_id != question_id:
        raise AppError(ERROR_CODES.OPTION_NOT_IN_QUESTION, "Invalid option")

    existing = await db.execute(
        select(AttemptAnswer)
        .where(
            AttemptAnswer.attempt_id == attempt.id,
            AttemptAnswer.question_id == question_id,
        )
        .with_for_update()
    )
    answer = existing.scalar_one_or_none()
    if answer is None:
        try:
            async with integrity_savepoint(db):
                db.add(
                    AttemptAnswer(
                        attempt_id=attempt.id,
                        question_id=question_id,
                        selected_option_id=body.selected_option_id,
                        is_correct=option.is_correct,
                    )
                )
                await db.flush()
        except IntegrityError:
            retry = await db.execute(
                select(AttemptAnswer)
                .where(
                    AttemptAnswer.attempt_id == attempt.id,
                    AttemptAnswer.question_id == question_id,
                )
                .with_for_update()
            )
            answer = retry.scalar_one()
            answer.selected_option_id = body.selected_option_id
            answer.is_correct = option.is_correct
    else:
        answer.selected_option_id = body.selected_option_id
        answer.is_correct = option.is_correct
    await db.flush()
    return success_response({"saved": True})


@router.post("/attempts/{attempt_id}/finish")
async def finish_attempt(attempt_id: str, user: Student, db: DbSession):
    attempt = await AttemptService(db).finish_attempt(user, attempt_id)
    attempt = await _load_attempt(db, attempt.id)
    stats = await db.execute(
        select(StudentStats).where(
            StudentStats.user_id == user.id,
            StudentStats.class_id == attempt.class_id,
        )
    )
    row = stats.scalar_one_or_none()
    total_xp = row.total_xp if row else attempt.xp_awarded or 0
    level = row.level if row else 1
    streak = row.streak if row else 1
    return success_response(
        {
            **attempt_result_to_out(
                attempt,
                questions=attempt.challenge.questions,
                answers=attempt.answers,
            ),
            **attempt_finish_stats_out(total_xp=total_xp, level=level, streak=streak),
        }
    )


@router.post("/attempts/{attempt_id}/duels")
async def create_duel(attempt_id: str, user: Student, db: DbSession):
    attempt = await _load_attempt(db, attempt_id)
    if attempt.user_id != user.id:
        raise AppError(ERROR_CODES.FORBIDDEN, "Not your attempt", status_code=403)
    if attempt.status != AttemptStatus.COMPLETED:
        raise AppError(
            ERROR_CODES.INVALID_ATTEMPT_STATE,
            "Attempt must be completed before creating a duel",
            status_code=409,
        )

    await advisory_lock(db, f"duel:create:{attempt.id}")
    existing = await db.execute(
        select(Duel).where(Duel.creator_attempt_id == attempt.id).with_for_update()
    )
    if existing.scalar_one_or_none():
        raise AppError(
            ERROR_CODES.DUEL_ALREADY_EXISTS,
            "Duel already exists for this attempt",
            status_code=409,
        )

    settings = get_settings()
    duel = Duel(
        class_id=attempt.class_id,
        challenge_id=attempt.challenge_id,
        creator_attempt_id=attempt.id,
        creator_id=user.id,
        expires_at=duel_expires_at(settings.duel_expiry_hours),
    )
    try:
        async with integrity_savepoint(db):
            db.add(duel)
            await db.flush()
    except IntegrityError:
        raise AppError(
            ERROR_CODES.DUEL_ALREADY_EXISTS,
            "Duel already exists for this attempt",
            status_code=409,
        ) from None
    return success_response(
        {
            "duel_id": duel.id,
            "share_code": duel.share_code,
            "expires_at": duel.expires_at,
            "share_path": f"/duel/{duel.share_code}",
        }
    )


@router.post("/attempts/{attempt_id}/duels/bot")
async def create_bot_duel(attempt_id: str, user: Student, db: DbSession):
    duel = await DuelService(db).create_bot_duel(user, attempt_id)
    return success_response({"duel_id": duel.id})
