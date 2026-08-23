from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Query
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, DbSession, require_roles
from app.core.cache import get_cache
from app.core.errors import AppError, ERROR_CODES, success_response
from app.core.enums import AttemptStatus, ChallengeStatus, DuelStatus, UserRole
from app.core.settings import get_settings
from app.models.entities import Attempt, Challenge, Duel, Subject, Topic, User, duel_expires_at
from app.services.calculations import calculate_leaderboard_rank_data, level_progress
from app.services.domain import MembershipService
from app.models.entities import StudentStats, TopicProgress

router = APIRouter(tags=["duels-me-leaderboard"])
Student = Annotated[CurrentUser, require_roles(UserRole.STUDENT)]


@router.post("/attempts/{attempt_id}/duels")
async def create_duel(attempt_id: str, user: Student, db: DbSession):
    attempt = await db.get(Attempt, attempt_id)
    if attempt is None:
        raise AppError(ERROR_CODES.ATTEMPT_NOT_FOUND, "Attempt not found", status_code=404)
    if attempt.user_id != user.id:
        raise AppError(ERROR_CODES.FORBIDDEN, "Not your attempt", status_code=403)
    if attempt.status != AttemptStatus.COMPLETED:
        raise AppError(ERROR_CODES.INVALID_ATTEMPT_STATE, "Attempt must be completed")

    duel = Duel(
        class_id=attempt.class_id,
        challenge_id=attempt.challenge_id,
        creator_attempt_id=attempt.id,
        creator_id=user.id,
        expires_at=duel_expires_at(get_settings().duel_expiry_hours),
    )
    db.add(duel)
    await db.flush()
    return success_response(
        {
            "id": duel.id,
            "share_code": duel.share_code,
            "status": duel.status,
            "expires_at": duel.expires_at,
        }
    )


@router.get("/duels/code/{share_code}")
async def get_duel_by_code(share_code: str, user: CurrentUser, db: DbSession):
    result = await db.execute(select(Duel).where(Duel.share_code == share_code))
    duel = result.scalar_one_or_none()
    if duel is None:
        raise AppError(ERROR_CODES.DUEL_NOT_FOUND, "Duel not found", status_code=404)
    await MembershipService(db).get_class_for_user(user, duel.class_id)
    return success_response(_duel_dict(duel))


@router.post("/duels/code/{share_code}/accept")
async def accept_duel(share_code: str, user: Student, db: DbSession):
    result = await db.execute(
        select(Duel).where(Duel.share_code == share_code).with_for_update()
    )
    duel = result.scalar_one_or_none()
    if duel is None:
        raise AppError(ERROR_CODES.DUEL_NOT_FOUND, "Duel not found", status_code=404)
    if duel.creator_id == user.id:
        raise AppError(ERROR_CODES.CANNOT_DUEL_SELF, "Cannot duel yourself", status_code=409)
    if duel.status == DuelStatus.COMPLETED:
        raise AppError(ERROR_CODES.DUEL_ALREADY_COMPLETED, "Duel already completed", status_code=409)
    from app.models.entities import utcnow

    if duel.expires_at < utcnow():
        duel.status = DuelStatus.EXPIRED
        raise AppError(ERROR_CODES.DUEL_EXPIRED, "Duel expired", status_code=410)
    if duel.opponent_id and duel.opponent_id != user.id:
        raise AppError(ERROR_CODES.DUEL_ALREADY_ACCEPTED, "Duel already accepted", status_code=409)

    await MembershipService(db).get_class_for_user(user, duel.class_id)

    challenge = await db.get(Challenge, duel.challenge_id)
    if challenge is None or challenge.status != ChallengeStatus.READY:
        raise AppError(ERROR_CODES.CHALLENGE_NOT_READY, "Challenge not ready", status_code=409)

    if duel.opponent_id is None:
        opponent_attempt = Attempt(
            challenge_id=duel.challenge_id,
            user_id=user.id,
            class_id=duel.class_id,
        )
        db.add(opponent_attempt)
        await db.flush()
        duel.opponent_id = user.id
        duel.opponent_attempt_id = opponent_attempt.id
        duel.status = DuelStatus.ACCEPTED

    await db.flush()
    return success_response(
        {
            "duel": _duel_dict(duel),
            "attempt_id": duel.opponent_attempt_id,
        }
    )


@router.get("/duels/{duel_id}")
async def get_duel(duel_id: str, user: CurrentUser, db: DbSession):
    duel = await db.get(Duel, duel_id)
    if duel is None:
        raise AppError(ERROR_CODES.DUEL_NOT_FOUND, "Duel not found", status_code=404)
    if user.id not in (duel.creator_id, duel.opponent_id) and user.role not in (
        UserRole.TEACHER,
        UserRole.ADMIN,
    ):
        raise AppError(ERROR_CODES.FORBIDDEN, "Access denied", status_code=403)
    return success_response(_duel_dict(duel))


@router.get("/me/duels")
async def my_duels(user: Student, db: DbSession):
    result = await db.execute(
        select(Duel).where(
            (Duel.creator_id == user.id) | (Duel.opponent_id == user.id)
        )
    )
    return success_response([_duel_dict(d) for d in result.scalars().all()])


@router.get("/me/dashboard")
async def dashboard(user: Student, db: DbSession):
    stats_result = await db.execute(
        select(StudentStats).where(StudentStats.user_id == user.id).limit(1)
    )
    stats = stats_result.scalar_one_or_none()
    total_xp = stats.total_xp if stats else 0
    level, current_level_xp, next_level_xp = level_progress(total_xp)

    attempts_result = await db.execute(
        select(Attempt)
        .where(Attempt.user_id == user.id, Attempt.status == AttemptStatus.COMPLETED)
        .order_by(Attempt.completed_at.desc())
        .limit(5)
    )
    recent = [
        {
            "id": a.id,
            "challenge_id": a.challenge_id,
            "score": a.score,
            "xp_awarded": a.xp_awarded,
            "completed_at": a.completed_at,
        }
        for a in attempts_result.scalars().all()
    ]

    return success_response(
        {
            "stats": {
                "total_xp": total_xp,
                "level": level,
                "current_level_xp": current_level_xp,
                "next_level_xp": next_level_xp,
                "streak": stats.streak if stats else 0,
                "attempts_completed": stats.attempts_completed if stats else 0,
            },
            "recent_attempts": recent,
            "streak": stats.streak if stats else 0,
            "level": level,
            "total_xp": total_xp,
        }
    )


@router.get("/me/stats")
async def my_stats(user: Student, db: DbSession):
    result = await db.execute(select(StudentStats).where(StudentStats.user_id == user.id))
    stats = result.scalars().all()
    return success_response(
        [
            {
                "class_id": s.class_id,
                "total_xp": s.total_xp,
                "level": s.level,
                "streak": s.streak,
                "attempts_completed": s.attempts_completed,
                "duels_won": s.duels_won,
            }
            for s in stats
        ]
    )


@router.get("/me/topics/progress")
async def topic_progress(user: Student, db: DbSession):
    result = await db.execute(select(TopicProgress).where(TopicProgress.user_id == user.id))
    return success_response(
        [
            {
                "topic_id": p.topic_id,
                "mastery_percent": p.mastery_percent,
                "mastery_category": p.mastery_category,
                "attempts_count": p.attempts_count,
            }
            for p in result.scalars().all()
        ]
    )


@router.get("/classes/{class_id}/leaderboard")
async def leaderboard(
    class_id: str,
    user: CurrentUser,
    db: DbSession,
    period: str = Query(default="all", pattern="^(week|all)$"),
):
    await MembershipService(db).get_class_for_user(user, class_id)
    cache = get_cache()
    cache_key = f"leaderboard:{class_id}:{period}"
    cached = await cache.get(cache_key)
    if cached:
        return success_response(cached)

    result = await db.execute(
        select(StudentStats, User)
        .join(User, User.id == StudentStats.user_id)
        .where(StudentStats.class_id == class_id)
    )
    rows = [
        (u.id, u.display_name, s.total_xp, s.level, s.streak)
        for s, u in result.all()
    ]
    entries = calculate_leaderboard_rank_data(rows)
    payload = {
        "period": period,
        "entries": [e.__dict__ for e in entries],
    }
    await cache.set(cache_key, payload, ttl=get_settings().redis_leaderboard_ttl_seconds)
    return success_response(payload)


def _duel_dict(duel: Duel) -> dict:
    return {
        "id": duel.id,
        "share_code": duel.share_code,
        "status": duel.status,
        "challenge_id": duel.challenge_id,
        "creator_id": duel.creator_id,
        "opponent_id": duel.opponent_id,
        "winner_id": duel.winner_id,
        "expires_at": duel.expires_at,
        "completed_at": duel.completed_at,
    }
