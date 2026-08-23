from __future__ import annotations

from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Query
from sqlalchemy import and_, func, or_, select

from server.api.deps import CurrentUser, DbSession, require_roles
from server.core.enums import AttemptStatus, DuelStatus, EntityStatus, UserRole
from server.core.errors import AppError, ERROR_CODES, success_response
from server.models.entities import (
    ActivityEvent,
    Attempt,
    Challenge,
    Duel,
    StudentStats,
    Subject,
    Topic,
    TopicProgress,
    User,
    XpLedger,
)
from server.services.calculations import calculate_class_analytics
from server.services.domain import AuthService, MembershipService

router = APIRouter(tags=["teacher"])
Teacher = Annotated[CurrentUser, require_roles(UserRole.TEACHER, UserRole.ADMIN)]


def _activity_cursor(event: ActivityEvent) -> str:
    return f"{event.created_at.isoformat()}|{event.id}"


def _parse_activity_cursor(cursor: str) -> tuple[datetime, str]:
    try:
        ts, event_id = cursor.rsplit("|", 1)
        return datetime.fromisoformat(ts), event_id
    except ValueError as exc:
        raise AppError(ERROR_CODES.VALIDATION_ERROR, "Invalid activity cursor") from exc


async def _student_duel_stats(db: DbSession, user_id: str, class_id: str) -> dict[str, int]:
    wins = await db.execute(
        select(func.count())
        .select_from(Duel)
        .where(
            Duel.class_id == class_id,
            Duel.status == DuelStatus.COMPLETED,
            Duel.winner_id == user_id,
        )
    )
    draws = await db.execute(
        select(func.count())
        .select_from(Duel)
        .where(
            Duel.class_id == class_id,
            Duel.status == DuelStatus.COMPLETED,
            Duel.result_type == "DRAW",
            or_(Duel.creator_id == user_id, Duel.opponent_id == user_id),
        )
    )
    total = await db.execute(
        select(func.count())
        .select_from(Duel)
        .where(
            Duel.class_id == class_id,
            Duel.status == DuelStatus.COMPLETED,
            or_(Duel.creator_id == user_id, Duel.opponent_id == user_id),
        )
    )
    wins_count = int(wins.scalar_one())
    draws_count = int(draws.scalar_one())
    total_count = int(total.scalar_one())
    return {
        "wins": wins_count,
        "losses": max(0, total_count - wins_count - draws_count),
        "draws": draws_count,
    }


@router.get("/classes/{class_id}/dashboard")
async def teacher_dashboard(class_id: str, user: Teacher, db: DbSession):
    await MembershipService(db).get_class_for_user(user, class_id)
    students = await db.execute(
        select(StudentStats, User)
        .join(User, User.id == StudentStats.user_id)
        .where(StudentStats.class_id == class_id)
    )
    stats_rows = []
    for stat, member in students.all():
        stats_rows.append(
            {
                "user_id": member.id,
                "display_name": member.display_name,
                "total_xp": stat.total_xp,
                "attempts_completed": stat.attempts_completed,
                "streak": stat.streak,
            }
        )

    attempts = await db.execute(
        select(Attempt).where(Attempt.class_id == class_id, Attempt.status == AttemptStatus.COMPLETED)
    )
    completed = attempts.scalars().all()
    topic_map: dict[str, tuple[str, list[float]]] = {}
    for attempt in completed:
        challenge = await db.get(Challenge, attempt.challenge_id)
        if challenge is None:
            continue
        topic = await db.get(Topic, challenge.topic_id)
        if topic is None:
            continue
        bucket = topic_map.setdefault(topic.id, (topic.title, []))
        bucket[1].append(attempt.accuracy_percent or 0)

    analytics_rows = calculate_class_analytics(
        [(topic_id, title, accs) for topic_id, (title, accs) in topic_map.items()]
    )
    weak_topics = [
        {
            "topic_id": row.topic_id,
            "title": row.title,
            "average_accuracy": row.average_accuracy,
            "is_weak": row.is_weak,
        }
        for row in analytics_rows
        if row.is_weak
    ]
    average_accuracy = (
        round(sum(a.accuracy_percent or 0 for a in completed) / len(completed), 2)
        if completed
        else 0
    )

    challenge_count = await db.execute(
        select(func.count())
        .select_from(Challenge)
        .join(Topic, Topic.id == Challenge.topic_id)
        .join(Subject, Subject.id == Topic.subject_id)
        .where(Subject.class_id == class_id)
    )
    duel_count = await db.execute(
        select(func.count()).select_from(Duel).where(Duel.class_id == class_id)
    )

    activity = await db.execute(
        select(ActivityEvent)
        .where(ActivityEvent.class_id == class_id)
        .order_by(ActivityEvent.created_at.desc())
        .limit(10)
    )

    return success_response(
        {
            "total_students": len(stats_rows),
            "active_students": len([s for s in stats_rows if s["attempts_completed"] > 0]),
            "completed_attempts": len(completed),
            "average_accuracy": average_accuracy,
            "total_challenges": int(challenge_count.scalar_one()),
            "total_duels": int(duel_count.scalar_one()),
            "weak_topics": weak_topics,
            "top_students": sorted(stats_rows, key=lambda x: x["total_xp"], reverse=True)[:5],
            "recent_activity": [
                {
                    "id": e.id,
                    "event_type": e.event_type,
                    "created_at": e.created_at,
                    "payload": e.payload,
                }
                for e in activity.scalars().all()
            ],
        }
    )


@router.get("/classes/{class_id}/students")
async def teacher_students(class_id: str, user: Teacher, db: DbSession):
    await MembershipService(db).get_class_for_user(user, class_id)
    result = await db.execute(
        select(StudentStats, User)
        .join(User, User.id == StudentStats.user_id)
        .where(StudentStats.class_id == class_id)
    )
    return success_response(
        [
            {
                "user": AuthService._user_dict(member),
                "total_xp": stat.total_xp,
                "level": stat.level,
                "streak": stat.streak,
                "completed_challenges": stat.attempts_completed,
                "average_accuracy": stat.average_accuracy,
                "last_activity_at": stat.last_attempt_at or stat.updated_at,
                "duel_wins": stat.duels_won,
            }
            for stat, member in result.all()
        ]
    )


@router.get("/classes/{class_id}/students/{student_user_id}")
async def teacher_student_detail(
    class_id: str, student_user_id: str, user: Teacher, db: DbSession
):
    await MembershipService(db).get_class_for_user(user, class_id)
    stat_result = await db.execute(
        select(StudentStats).where(
            StudentStats.class_id == class_id,
            StudentStats.user_id == student_user_id,
        )
    )
    stats = stat_result.scalar_one_or_none()
    student = await db.get(User, student_user_id)
    attempts = await db.execute(
        select(Attempt)
        .where(Attempt.user_id == student_user_id, Attempt.class_id == class_id)
        .order_by(Attempt.started_at.desc())
        .limit(10)
    )
    progress_result = await db.execute(
        select(TopicProgress, Topic)
        .join(Topic, Topic.id == TopicProgress.topic_id)
        .join(Subject, Subject.id == Topic.subject_id)
        .where(TopicProgress.user_id == student_user_id, Subject.class_id == class_id)
    )
    duel_stats = await _student_duel_stats(db, student_user_id, class_id)
    return success_response(
        {
            "profile": AuthService._user_dict(student) if student else None,
            "stats": {
                "total_xp": stats.total_xp if stats else 0,
                "level": stats.level if stats else 1,
                "streak": stats.streak if stats else 0,
                "completed_challenges": stats.attempts_completed if stats else 0,
                "average_accuracy": stats.average_accuracy if stats else 0.0,
            },
            "topic_progress": [
                {
                    "topic_id": topic.id,
                    "title": topic.title,
                    "mastery_percent": progress.mastery_percent,
                    "mastery_category": progress.mastery_category,
                    "attempts_count": progress.attempts_count,
                }
                for progress, topic in progress_result.all()
            ],
            "duel_stats": duel_stats,
            "recent_attempts": [
                {"id": a.id, "score": a.score, "accuracy_percent": a.accuracy_percent}
                for a in attempts.scalars().all()
            ],
        }
    )


@router.get("/classes/{class_id}/topics/analytics")
async def teacher_topics_analytics(class_id: str, user: Teacher, db: DbSession):
    await MembershipService(db).get_class_for_user(user, class_id)
    topics = await db.execute(
        select(Topic)
        .join(Subject, Subject.id == Topic.subject_id)
        .where(Subject.class_id == class_id, Topic.status == EntityStatus.ACTIVE)
    )
    payload = []
    for topic in topics.scalars().all():
        attempts = await db.execute(
            select(Attempt)
            .join(Challenge, Challenge.id == Attempt.challenge_id)
            .where(Challenge.topic_id == topic.id, Attempt.status == AttemptStatus.COMPLETED)
        )
        rows = attempts.scalars().all()
        avg = sum(a.accuracy_percent or 0 for a in rows) / len(rows) if rows else 0
        unique_participants = len({a.user_id for a in rows})
        mastery_result = await db.execute(
            select(func.avg(TopicProgress.mastery_percent)).where(
                TopicProgress.topic_id == topic.id
            )
        )
        mastery_average = float(mastery_result.scalar_one() or 0)
        payload.append(
            {
                "topic": {"id": topic.id, "title": topic.title, "difficulty": topic.difficulty},
                "unique_participants": unique_participants,
                "attempts_count": len(rows),
                "average_accuracy": avg,
                "mastery_average": round(mastery_average, 2),
                "is_weak": len(rows) >= 3 and avg < 60,
            }
        )
    return success_response(payload)


@router.get("/topics/{topic_id}/analytics")
async def teacher_topic_analytics(topic_id: str, user: Teacher, db: DbSession):
    topic = await db.get(Topic, topic_id)
    if topic is None:
        raise AppError(ERROR_CODES.TOPIC_NOT_FOUND, "Topic not found", status_code=404)
    subject = await db.get(Subject, topic.subject_id)
    if subject is None:
        raise AppError(ERROR_CODES.SUBJECT_NOT_FOUND, "Subject not found", status_code=404)
    await MembershipService(db).get_class_for_user(user, subject.class_id)

    attempts = await db.execute(
        select(Attempt)
        .join(Challenge, Challenge.id == Attempt.challenge_id)
        .where(Challenge.topic_id == topic_id, Attempt.status == AttemptStatus.COMPLETED)
    )
    rows = attempts.scalars().all()
    avg_accuracy = sum(a.accuracy_percent or 0 for a in rows) / len(rows) if rows else 0

    progress_rows = await db.execute(
        select(TopicProgress, User)
        .join(User, User.id == TopicProgress.user_id)
        .where(TopicProgress.topic_id == topic_id)
    )
    distribution: dict[str, int] = {}
    strongest: list[dict] = []
    weakest: list[dict] = []
    for progress, member in progress_rows.all():
        distribution[progress.mastery_category] = distribution.get(progress.mastery_category, 0) + 1
        entry = {
            "user": AuthService._user_dict(member),
            "mastery_percent": progress.mastery_percent,
        }
        strongest.append(entry)
        weakest.append(entry)
    strongest.sort(key=lambda x: x["mastery_percent"], reverse=True)
    weakest.sort(key=lambda x: x["mastery_percent"])

    return success_response(
        {
            "topic_id": topic_id,
            "participants": len({a.user_id for a in rows}),
            "attempts_count": len(rows),
            "average_accuracy": avg_accuracy,
            "average_score": sum(a.score or 0 for a in rows) / len(rows) if rows else 0,
            "mastery_distribution": distribution,
            "strongest_students": strongest[:5],
            "students_needing_attention": weakest[:5],
            "recent_attempts": [
                {
                    "id": a.id,
                    "user_id": a.user_id,
                    "score": a.score,
                    "accuracy_percent": a.accuracy_percent,
                    "completed_at": a.completed_at,
                }
                for a in sorted(rows, key=lambda x: x.completed_at or x.started_at, reverse=True)[:10]
            ],
        }
    )


@router.get("/classes/{class_id}/activity")
async def teacher_activity(
    class_id: str,
    user: Teacher,
    db: DbSession,
    limit: Annotated[int, Query(ge=1, le=100)] = 30,
    cursor: Annotated[str | None, Query()] = None,
    type: Annotated[str | None, Query()] = None,
):
    await MembershipService(db).get_class_for_user(user, class_id)
    query = select(ActivityEvent).where(ActivityEvent.class_id == class_id)
    if type:
        query = query.where(ActivityEvent.event_type == type)
    if cursor:
        cursor_time, cursor_id = _parse_activity_cursor(cursor)
        query = query.where(
            or_(
                ActivityEvent.created_at < cursor_time,
                and_(
                    ActivityEvent.created_at == cursor_time,
                    ActivityEvent.id < cursor_id,
                ),
            )
        )
    query = query.order_by(ActivityEvent.created_at.desc(), ActivityEvent.id.desc()).limit(limit + 1)
    result = await db.execute(query)
    events = result.scalars().all()
    next_cursor = None
    if len(events) > limit:
        next_cursor = _activity_cursor(events[limit - 1])
        events = events[:limit]
    return success_response(
        {
            "items": [
                {
                    "id": e.id,
                    "class_id": e.class_id,
                    "user_id": e.user_id,
                    "type": e.event_type,
                    "metadata": e.payload,
                    "created_at": e.created_at,
                }
                for e in events
            ],
            "next_cursor": next_cursor,
        }
    )


@router.get("/classes/{class_id}/reports/overview")
async def teacher_report_overview(
    class_id: str,
    user: Teacher,
    db: DbSession,
    from_: Annotated[datetime | None, Query(alias="from")] = None,
    to: Annotated[datetime | None, Query()] = None,
):
    await MembershipService(db).get_class_for_user(user, class_id)
    query = select(Attempt).where(
        Attempt.class_id == class_id,
        Attempt.status == AttemptStatus.COMPLETED,
    )
    if from_:
        query = query.where(Attempt.completed_at >= from_)
    if to:
        query = query.where(Attempt.completed_at <= to)
    attempts = (await db.execute(query)).scalars().all()

    duel_query = select(Duel).where(Duel.class_id == class_id)
    if from_:
        duel_query = duel_query.where(Duel.created_at >= from_)
    if to:
        duel_query = duel_query.where(Duel.created_at <= to)
    duels = (await db.execute(duel_query)).scalars().all()

    xp_query = select(func.coalesce(func.sum(XpLedger.amount), 0)).where(XpLedger.class_id == class_id)
    if from_:
        xp_query = xp_query.where(XpLedger.created_at >= from_)
    if to:
        xp_query = xp_query.where(XpLedger.created_at <= to)
    xp_earned = int((await db.execute(xp_query)).scalar_one())

    topic_map: dict[str, tuple[str, list[float]]] = {}
    for attempt in attempts:
        challenge = await db.get(Challenge, attempt.challenge_id)
        if challenge is None:
            continue
        topic = await db.get(Topic, challenge.topic_id)
        if topic is None:
            continue
        bucket = topic_map.setdefault(topic.id, (topic.title, []))
        bucket[1].append(attempt.accuracy_percent or 0)
    analytics_rows = calculate_class_analytics(
        [(topic_id, title, accs) for topic_id, (title, accs) in topic_map.items()]
    )
    top_topics = sorted(analytics_rows, key=lambda r: r.average_accuracy, reverse=True)[:5]
    weak_topics = [row for row in analytics_rows if row.is_weak]

    active_student_ids = {a.user_id for a in attempts}

    return success_response(
        {
            "active_students": len(active_student_ids),
            "attempts": len(attempts),
            "completed_challenges": len(attempts),
            "avg_accuracy": sum(a.accuracy_percent or 0 for a in attempts) / len(attempts)
            if attempts
            else 0,
            "xp_earned": xp_earned,
            "duels_created": len(duels),
            "duels_completed": len([d for d in duels if d.status == DuelStatus.COMPLETED]),
            "top_topics": [
                {
                    "topic_id": row.topic_id,
                    "title": row.title,
                    "average_accuracy": row.average_accuracy,
                }
                for row in top_topics
            ],
            "weak_topics": [
                {
                    "topic_id": row.topic_id,
                    "title": row.title,
                    "average_accuracy": row.average_accuracy,
                }
                for row in weak_topics
            ],
        }
    )


@router.get("/classes/{class_id}/reports/leaderboard")
async def teacher_report_leaderboard(
    class_id: str,
    user: Teacher,
    db: DbSession,
    period: Annotated[str, Query()] = "all",
    limit: Annotated[int, Query(ge=1, le=200)] = 100,
):
    await MembershipService(db).get_class_for_user(user, class_id)
    result = await db.execute(
        select(StudentStats, User)
        .join(User, User.id == StudentStats.user_id)
        .where(StudentStats.class_id == class_id)
        .order_by(StudentStats.total_xp.desc())
        .limit(limit)
    )
    rows = result.all()
    return success_response(
        [
            {
                "rank": idx,
                "user": AuthService._user_dict(member),
                "total_xp": stat.total_xp,
                "accuracy": stat.average_accuracy,
                "completed_challenges": stat.attempts_completed,
                "duel_wins": stat.duels_won,
                "streak": stat.streak,
            }
            for idx, (stat, member) in enumerate(rows, start=1)
        ]
    )
