from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from server.api.deps import CurrentUser, DbSession, require_roles
from server.api.mappers import (
    attempt_to_out,
    challenge_detail_to_out,
    duel_result_type,
    duel_status_to_api,
)
from server.core.enums import DuelStatus, UserRole
from server.core.errors import AppError, ERROR_CODES, success_response
from server.models.entities import Attempt, Challenge, Duel, Question, Subject, Topic, User, utcnow
from server.services.domain import AuthService, DuelService, MembershipService

router = APIRouter(tags=["duels"])
Student = Annotated[CurrentUser, require_roles(UserRole.STUDENT)]


async def _get_duel_by_code(db: DbSession, share_code: str) -> Duel:
    result = await db.execute(select(Duel).where(Duel.share_code == share_code))
    duel = result.scalar_one_or_none()
    if duel is None:
        raise AppError(ERROR_CODES.DUEL_NOT_FOUND, "Duel not found", status_code=404)
    return duel


async def _load_challenge(db: DbSession, challenge_id: str) -> Challenge | None:
    return await db.get(
        Challenge,
        challenge_id,
        options=[
            selectinload(Challenge.topic).selectinload(Topic.subject),
            selectinload(Challenge.questions).selectinload(Question.options),
        ],
    )


@router.get("/code/{share_code}")
async def preview_duel(share_code: str, user: CurrentUser, db: DbSession):
    duel = await _get_duel_by_code(db, share_code)
    if duel.expires_at < utcnow() and duel.status == DuelStatus.PENDING:
        duel.status = DuelStatus.EXPIRED
        await db.flush()
        raise AppError(ERROR_CODES.DUEL_EXPIRED, "Duel expired", status_code=410)

    challenge = await _load_challenge(db, duel.challenge_id)
    creator = await db.get(User, duel.creator_id)
    await MembershipService(db).get_class_for_user(user, duel.class_id)

    subject_name = challenge.topic.subject.name if challenge and challenge.topic.subject else ""
    return success_response(
        {
            "share_code": duel.share_code,
            "status": duel_status_to_api(duel.status),
            "challenger": AuthService._user_dict(creator) if creator else None,
            "subject_name": subject_name,
            "topic_title": challenge.topic.title if challenge else "",
            "difficulty": challenge.difficulty if challenge else "",
            "question_count": challenge.question_count if challenge else 0,
            "expires_at": duel.expires_at,
        }
    )


@router.post("/code/{share_code}/accept")
async def accept_duel(share_code: str, user: Student, db: DbSession):
    duel, opponent_attempt, challenge = await DuelService(db).accept_duel(user, share_code)
    return success_response(
        {
            "duel_id": duel.id,
            "status": duel_status_to_api(duel.status),
            "opponent_attempt_id": opponent_attempt.id,
            "accepted_at": duel.accepted_at,
            "challenge": challenge_detail_to_out(challenge, include_correct=False),
        }
    )


@router.get("/{duel_id}")
async def get_duel(duel_id: str, user: CurrentUser, db: DbSession):
    duel = await db.get(Duel, duel_id)
    if duel is None:
        raise AppError(ERROR_CODES.DUEL_NOT_FOUND, "Duel not found", status_code=404)

    if user.role not in (UserRole.TEACHER, UserRole.ADMIN):
        if user.id not in {duel.creator_id, duel.opponent_id}:
            raise AppError(ERROR_CODES.FORBIDDEN, "Not a duel participant", status_code=403)
    else:
        await MembershipService(db).get_class_for_user(user, duel.class_id)

    creator = await db.get(User, duel.creator_id)
    opponent = await db.get(User, duel.opponent_id) if duel.opponent_id else None
    creator_attempt = await db.get(Attempt, duel.creator_attempt_id)
    opponent_attempt = (
        await db.get(Attempt, duel.opponent_attempt_id) if duel.opponent_attempt_id else None
    )
    challenge = await _load_challenge(db, duel.challenge_id)

    return success_response(
        {
            "id": duel.id,
            "status": duel_status_to_api(duel.status),
            "share_code": duel.share_code,
            "challenge_id": duel.challenge_id,
            "challenge": challenge_detail_to_out(challenge, include_correct=False)
            if challenge
            else None,
            "challenger": {
                "user": AuthService._user_dict(creator) if creator else None,
                "result": attempt_to_out(creator_attempt) if creator_attempt else None,
            },
            "opponent": {
                "user": AuthService._user_dict(opponent) if opponent else None,
                "result": attempt_to_out(opponent_attempt) if opponent_attempt else None,
            },
            "winner_id": duel.winner_id,
            "result_type": duel_result_type(duel),
            "expires_at": duel.expires_at,
            "accepted_at": duel.accepted_at,
            "completed_at": duel.completed_at,
        }
    )
