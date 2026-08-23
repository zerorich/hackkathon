from __future__ import annotations

from datetime import datetime
from typing import Annotated, Any

from fastapi import APIRouter, Query
from sqlalchemy import and_, or_, select

from app.api.deps import CurrentUser, DbSession, require_roles
from app.api.mappers import attempt_to_out
from app.core.enums import (
    AttemptStatus,
    DuelStatus,
    EntityStatus,
    MasteryCategory,
    MembershipStatus,
    UserRole,
)
from app.core.errors import success_response
from app.models.entities import (
    ActivityEvent,
    Attempt,
    Challenge,
    ClassMembership,
    Duel,
    SchoolClass,
    StudentStats,
    Subject,
    Topic,
    TopicProgress,
)
from app.services.calculations import level_progress
from app.services.domain import AuthService, LeaderboardService

router = APIRouter(tags=["me"])
Student = Annotated[CurrentUser, require_roles(UserRole.STUDENT)]


def _encode_cursor(dt: datetime, item_id: str) -> str:
    return f"{dt.isoformat()}|{item_id}"


def _decode_cursor(cursor: str) -> tuple[datetime, str]:
    ts, item_id = cursor.split("|", 1)
    return datetime.fromisoformat(ts), item_id


def _paginated(items: list[Any], *, limit: int) -> dict:
    next_cursor = None
    if len(items) > limit:
        last = items[limit - 1]
        items = items[:limit]
        if isinstance(last, Attempt):
            next_cursor = _encode_cursor(last.started_at, last.id)
        elif isinstance(last, Duel):
            next_cursor = _encode_cursor(last.created_at, last.id)
    return {"items": items, "next_cursor": next_cursor}


async def _get_membership_context(user: CurrentUser, db: DbSession):
    result = await db.execute(
        select(ClassMembership, SchoolClass)
        .join(SchoolClass, SchoolClass.id == ClassMembership.class_id)
        .where(
            ClassMembership.user_id == user.id,
            ClassMembership.status == MembershipStatus.ACTIVE,
        )
        .limit(1)
    )
    row = result.first()
    if row is None:
        return None, None
    return row[0], row[1]


async def _get_class_stats(user_id: str, class_id: str, db: DbSession) -> StudentStats | None:
    result = await db.execute(
        select(StudentStats).where(
            StudentStats.user_id == user_id,
            StudentStats.class_id == class_id,
        )
    )
    return result.scalar_one_or_none()


@router.get("/dashboard")
async def get_dashboard(user: Student, db: DbSession):
    member, school_class = await _get_membership_context(user, db)
    stats_row = (
        await _get_class_stats(user.id, member.class_id, db) if member else None
    )
    total_xp = stats_row.total_xp if stats_row else 0
    level, current_level_xp, next_level_xp = level_progress(total_xp)

    subjects: list[dict] = []
    if member:
        subj_result = await db.execute(
            select(Subject).where(
                Subject.class_id == member.class_id,
                Subject.status == EntityStatus.ACTIVE,
            )
        )
        subjects = [
            {"id": s.id, "name": s.name, "icon_key": s.icon_key}
            for s in subj_result.scalars().all()
        ]

    recommended_topic = None
    prog_result = await db.execute(
        select(TopicProgress, Topic)
        .join(Topic, Topic.id == TopicProgress.topic_id)
        .where(
            TopicProgress.user_id == user.id,
            TopicProgress.mastery_category.in_(
                [MasteryCategory.WEAK, MasteryCategory.LEARNING]
            ),
        )
        .order_by(TopicProgress.mastery_percent.asc())
        .limit(1)
    )
    rec = prog_result.first()
    if rec:
        prog, topic = rec
        recommended_topic = {
            "topic_id": topic.id,
            "title": topic.title,
            "subject_id": topic.subject_id,
            "mastery_percent": prog.mastery_percent,
            "mastery_category": prog.mastery_category,
        }

    leaderboard_preview = None
    if member:
        lb = await LeaderboardService(db).for_class(
            user, member.class_id, period="all", limit=5
        )
        leaderboard_preview = {
            "period": lb["period"],
            "entries": lb["entries"],
            "current_user_rank": lb["current_user_rank"],
        }

    recent = await db.execute(
        select(Attempt)
        .where(Attempt.user_id == user.id, Attempt.status == AttemptStatus.COMPLETED)
        .order_by(Attempt.completed_at.desc())
        .limit(5)
    )
    active_duels = await db.execute(
        select(Duel).where(
            ((Duel.creator_id == user.id) | (Duel.opponent_id == user.id)),
            Duel.status.in_([DuelStatus.PENDING, DuelStatus.ACCEPTED]),
        )
    )

    recent_activity: list[dict] = []
    if member:
        activity_result = await db.execute(
            select(ActivityEvent)
            .where(ActivityEvent.class_id == member.class_id)
            .order_by(ActivityEvent.created_at.desc())
            .limit(5)
        )
        recent_activity = [
            {
                "id": e.id,
                "event_type": e.event_type,
                "user_id": e.user_id,
                "payload": e.payload,
                "created_at": e.created_at,
            }
            for e in activity_result.scalars().all()
        ]

    return success_response(
        {
            "profile": AuthService._user_dict(user),
            "class": (
                {"id": school_class.id, "name": school_class.name, "grade": school_class.grade}
                if school_class
                else None
            ),
            "total_xp": total_xp,
            "level": level,
            "level_progress": {
                "current_level_xp": current_level_xp,
                "next_level_xp": next_level_xp,
            },
            "streak": stats_row.streak if stats_row else 0,
            "best_streak": stats_row.best_streak if stats_row else 0,
            "average_accuracy": stats_row.average_accuracy if stats_row else 0.0,
            "completed_challenges": stats_row.attempts_completed if stats_row else 0,
            "subjects": subjects,
            "recommended_topic": recommended_topic,
            "leaderboard_preview": leaderboard_preview,
            "active_duels": [
                {"id": d.id, "share_code": d.share_code, "status": d.status}
                for d in active_duels.scalars().all()
            ],
            "recent_attempts": [attempt_to_out(a) for a in recent.scalars().all()],
            "recent_activity": recent_activity,
        }
    )


@router.get("/stats")
async def get_stats(user: Student, db: DbSession):
    stats = await db.execute(select(StudentStats).where(StudentStats.user_id == user.id))
    rows = stats.scalars().all()
    total_xp = sum(r.total_xp for r in rows)
    streak = max((r.streak for r in rows), default=0)
    best_streak = max((r.best_streak for r in rows), default=0)
    completed = sum(r.attempts_completed for r in rows)
    total_correct = sum(r.total_correct_answers for r in rows)
    total_answers = sum(r.total_answers for r in rows)
    avg_accuracy = (
        round((total_correct / total_answers) * 100, 2) if total_answers else 0.0
    )
    level, current_level_xp, next_level_xp = level_progress(total_xp)
    return success_response(
        {
            "total_xp": total_xp,
            "level": level,
            "level_progress": {
                "current_level_xp": current_level_xp,
                "next_level_xp": next_level_xp,
            },
            "current_streak": streak,
            "best_streak": best_streak,
            "completed_challenges": completed,
            "average_accuracy": avg_accuracy,
            "duel_wins": sum(r.duels_won for r in rows),
            "duel_losses": sum(r.duels_lost for r in rows),
            "duel_draws": sum(r.duels_drawn for r in rows),
        }
    )


@router.get("/topics/progress")
async def get_topic_progress(
    user: Student,
    db: DbSession,
    subject_id: Annotated[str | None, Query()] = None,
):
    query = select(TopicProgress).where(TopicProgress.user_id == user.id)
    if subject_id:
        query = query.join(Topic, Topic.id == TopicProgress.topic_id).where(
            Topic.subject_id == subject_id
        )
    result = await db.execute(query)
    return success_response(
        [
            {
                "topic_id": p.topic_id,
                "attempts_count": p.attempts_count,
                "mastery_score": p.mastery_percent,
                "mastery_level": p.mastery_category,
            }
            for p in result.scalars().all()
        ]
    )


@router.get("/attempts")
async def list_my_attempts(
    user: Student,
    db: DbSession,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    cursor: Annotated[str | None, Query()] = None,
    subject_id: Annotated[str | None, Query()] = None,
    topic_id: Annotated[str | None, Query()] = None,
):
    query = select(Attempt).where(Attempt.user_id == user.id)
    if topic_id or subject_id:
        query = query.join(Challenge, Challenge.id == Attempt.challenge_id)
        if topic_id:
            query = query.where(Challenge.topic_id == topic_id)
        if subject_id:
            query = query.join(Topic, Topic.id == Challenge.topic_id).where(
                Topic.subject_id == subject_id
            )
    if cursor:
        cursor_dt, cursor_id = _decode_cursor(cursor)
        query = query.where(
            or_(
                Attempt.started_at < cursor_dt,
                and_(Attempt.started_at == cursor_dt, Attempt.id < cursor_id),
            )
        )
    query = query.order_by(Attempt.started_at.desc(), Attempt.id.desc()).limit(limit + 1)
    result = await db.execute(query)
    attempts = list(result.scalars().all())
    page = _paginated(attempts, limit=limit)
    return success_response(
        {
            "items": [attempt_to_out(a) for a in page["items"]],
            "next_cursor": page["next_cursor"],
        }
    )


@router.get("/duels")
async def list_my_duels(
    user: Student,
    db: DbSession,
    status: Annotated[str | None, Query()] = None,
    cursor: Annotated[str | None, Query()] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
):
    query = select(Duel).where((Duel.creator_id == user.id) | (Duel.opponent_id == user.id))
    if status:
        query = query.where(Duel.status == status)
    if cursor:
        cursor_dt, cursor_id = _decode_cursor(cursor)
        query = query.where(
            or_(
                Duel.created_at < cursor_dt,
                and_(Duel.created_at == cursor_dt, Duel.id < cursor_id),
            )
        )
    query = query.order_by(Duel.created_at.desc(), Duel.id.desc()).limit(limit + 1)
    result = await db.execute(query)
    duels = list(result.scalars().all())
    page = _paginated(duels, limit=limit)
    return success_response(
        {
            "items": [
                {
                    "id": d.id,
                    "share_code": d.share_code,
                    "status": d.status,
                    "winner_id": d.winner_id,
                    "expires_at": d.expires_at,
                }
                for d in page["items"]
            ],
            "next_cursor": page["next_cursor"],
        }
    )
