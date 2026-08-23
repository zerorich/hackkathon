from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, DbSession, require_roles
from app.api.mappers import attempt_result_to_out, attempt_to_out
from app.api.schemas import AnswerBody
from app.core.errors import AppError, ERROR_CODES, success_response
from app.core.enums import AttemptStatus, ChallengeStatus, UserRole
from app.models.entities import Attempt, AttemptAnswer, Challenge, Question, QuestionOption, Subject
from app.services.domain import AttemptService, MembershipService

router = APIRouter(tags=["attempts"])
Student = Annotated[CurrentUser, require_roles(UserRole.STUDENT)]


@router.post("/challenges/{challenge_id}/attempts")
async def start_attempt(challenge_id: str, user: Student, db: DbSession):
    result = await db.execute(
        select(Challenge)
        .where(Challenge.id == challenge_id)
        .options(selectinload(Challenge.topic))
    )
    challenge = result.scalar_one_or_none()
    if challenge is None:
        raise AppError(ERROR_CODES.CHALLENGE_NOT_FOUND, "Challenge not found", status_code=404)
    if challenge.status != ChallengeStatus.READY:
        raise AppError(ERROR_CODES.CHALLENGE_NOT_READY, "Challenge not ready", status_code=409)

    subject = await db.get(Subject, challenge.topic.subject_id)
    if subject is None:
        raise AppError(ERROR_CODES.CHALLENGE_ACCESS_DENIED, "Access denied", status_code=403)
    await MembershipService(db).get_class_for_user(user, subject.class_id)

    attempt = Attempt(
        challenge_id=challenge.id,
        user_id=user.id,
        class_id=subject.class_id,
    )
    db.add(attempt)
    await db.flush()
    return success_response(attempt_to_out(attempt))


@router.get("/attempts/{attempt_id}")
async def get_attempt(attempt_id: str, user: CurrentUser, db: DbSession):
    attempt = await _load_attempt(db, attempt_id)
    if attempt.user_id != user.id and user.role not in (UserRole.TEACHER, UserRole.ADMIN):
        raise AppError(ERROR_CODES.FORBIDDEN, "Access denied", status_code=403)

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
    if attempt.user_id != user.id:
        raise AppError(ERROR_CODES.FORBIDDEN, "Not your attempt", status_code=403)
    if attempt.status != AttemptStatus.IN_PROGRESS:
        raise AppError(ERROR_CODES.ATTEMPT_ALREADY_COMPLETED, "Attempt already completed")

    question = next((q for q in attempt.challenge.questions if q.id == question_id), None)
    if question is None:
        raise AppError(ERROR_CODES.QUESTION_NOT_IN_CHALLENGE, "Question not in challenge")

    option = next((o for o in question.options if o.id == body.selected_option_id), None)
    if option is None:
        raise AppError(ERROR_CODES.OPTION_NOT_IN_QUESTION, "Option not in question")

    existing = await db.execute(
        select(AttemptAnswer).where(
            AttemptAnswer.attempt_id == attempt.id,
            AttemptAnswer.question_id == question_id,
        )
    )
    answer = existing.scalar_one_or_none()
    if answer is None:
        answer = AttemptAnswer(
            attempt_id=attempt.id,
            question_id=question_id,
            selected_option_id=body.selected_option_id,
            is_correct=option.is_correct,
        )
        db.add(answer)
    else:
        answer.selected_option_id = body.selected_option_id
        answer.is_correct = option.is_correct

    await db.flush()
    return success_response({"saved": True})


@router.post("/attempts/{attempt_id}/finish")
async def finish_attempt(attempt_id: str, user: Student, db: DbSession):
    attempt = await AttemptService(db).finish_attempt(user, attempt_id)
    attempt = await _load_attempt(db, attempt.id)
    return success_response(
        attempt_result_to_out(
            attempt,
            questions=attempt.challenge.questions,
            answers=attempt.answers,
        )
    )


@router.get("/me/attempts")
async def my_attempts(user: Student, db: DbSession):
    result = await db.execute(
        select(Attempt)
        .where(Attempt.user_id == user.id)
        .order_by(Attempt.created_at.desc())
        .limit(50)
    )
    return success_response([attempt_to_out(a) for a in result.scalars().all()])


async def _load_attempt(db, attempt_id: str) -> Attempt:
    result = await db.execute(
        select(Attempt)
        .where(Attempt.id == attempt_id)
        .options(
            selectinload(Attempt.answers),
            selectinload(Attempt.challenge)
            .selectinload(Challenge.questions)
            .selectinload(Question.options),
        )
    )
    attempt = result.scalar_one_or_none()
    if attempt is None:
        raise AppError(ERROR_CODES.ATTEMPT_NOT_FOUND, "Attempt not found", status_code=404)
    return attempt
