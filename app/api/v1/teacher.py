from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter
from sqlalchemy import func, select

from app.api.deps import CurrentUser, DbSession, require_roles
from app.core.errors import success_response
from app.core.enums import AttemptStatus, UserRole
from app.models.entities import ActivityEvent, Attempt, Challenge, StudentStats, Subject, Topic, User
from app.services.calculations import calculate_class_analytics
from app.services.domain import MembershipService

router = APIRouter(prefix="/teacher", tags=["teacher"])
Teacher = Annotated[CurrentUser, require_roles(UserRole.TEACHER, UserRole.ADMIN)]


@router.get("/classes/{class_id}/dashboard")
async def teacher_dashboard(class_id: str, user: Teacher, db: DbSession):
    await MembershipService(db).get_class_for_user(user, class_id)

    stats_count = await db.scalar(
        select(func.count(StudentStats.id)).where(StudentStats.class_id == class_id)
    )
    attempts_count = await db.scalar(
        select(func.count(Attempt.id)).where(
            Attempt.class_id == class_id,
            Attempt.status == AttemptStatus.COMPLETED,
        )
    )
    avg_score = await db.scalar(
        select(func.avg(Attempt.score)).where(
            Attempt.class_id == class_id,
            Attempt.status == AttemptStatus.COMPLETED,
        )
    )

    top = await db.execute(
        select(StudentStats, User)
        .join(User, User.id == StudentStats.user_id)
        .where(StudentStats.class_id == class_id)
        .order_by(StudentStats.total_xp.desc())
        .limit(5)
    )
    top_students = [
        {"user_id": u.id, "display_name": u.display_name, "total_xp": s.total_xp}
        for s, u in top.all()
    ]

    topics_result = await db.execute(
        select(Topic, Subject)
        .join(Subject, Subject.id == Topic.subject_id)
        .where(Subject.class_id == class_id, Topic.status == "ACTIVE")
    )
    weak_topics = []
    for topic, _subject in topics_result.all():
        acc_result = await db.execute(
            select(Attempt.accuracy_percent)
            .join(Challenge, Challenge.id == Attempt.challenge_id)
            .where(
                Challenge.topic_id == topic.id,
                Attempt.status == AttemptStatus.COMPLETED,
                Attempt.accuracy_percent.is_not(None),
            )
        )
        accuracies = [float(r[0]) for r in acc_result.all()]
        analytics = calculate_class_analytics([(topic.id, topic.title, accuracies)])
        if analytics and analytics[0].is_weak:
            weak_topics.append(
                {
                    "topic_id": topic.id,
                    "title": topic.title,
                    "average_accuracy": analytics[0].average_accuracy,
                }
            )

    return success_response(
        {
            "students_count": stats_count or 0,
            "attempts_completed": attempts_count or 0,
            "average_score": round(float(avg_score or 0), 2),
            "top_students": top_students,
            "weak_topics": weak_topics,
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
                "user_id": u.id,
                "display_name": u.display_name,
                "total_xp": s.total_xp,
                "level": s.level,
                "streak": s.streak,
                "attempts_completed": s.attempts_completed,
            }
            for s, u in result.all()
        ]
    )


@router.get("/classes/{class_id}/students/{user_id}")
async def teacher_student_detail(class_id: str, user_id: str, user: Teacher, db: DbSession):
    await MembershipService(db).get_class_for_user(user, class_id)
    result = await db.execute(
        select(StudentStats, User).join(User, User.id == StudentStats.user_id).where(
            StudentStats.class_id == class_id,
            StudentStats.user_id == user_id,
        )
    )
    row = result.first()
    if row is None:
        return success_response(None)
    stats, student = row
    attempts = await db.execute(
        select(Attempt)
        .where(Attempt.user_id == user_id, Attempt.class_id == class_id)
        .order_by(Attempt.completed_at.desc())
        .limit(20)
    )
    return success_response(
        {
            "user": {"id": student.id, "display_name": student.display_name},
            "stats": {
                "total_xp": stats.total_xp,
                "level": stats.level,
                "streak": stats.streak,
            },
            "recent_attempts": [
                {"id": a.id, "score": a.score, "completed_at": a.completed_at}
                for a in attempts.scalars().all()
            ],
        }
    )


@router.get("/classes/{class_id}/topics/analytics")
async def topics_analytics(class_id: str, user: Teacher, db: DbSession):
    await MembershipService(db).get_class_for_user(user, class_id)
    topics_result = await db.execute(
        select(Topic, Subject)
        .join(Subject, Subject.id == Topic.subject_id)
        .where(Subject.class_id == class_id)
    )
    rows = []
    for topic, _ in topics_result.all():
        acc_result = await db.execute(
            select(Attempt.accuracy_percent)
            .join(Challenge, Challenge.id == Attempt.challenge_id)
            .where(Challenge.topic_id == topic.id, Attempt.status == AttemptStatus.COMPLETED)
        )
        accuracies = [float(r[0]) for r in acc_result.all() if r[0] is not None]
        rows.append((topic.id, topic.title, accuracies))
    analytics = calculate_class_analytics(rows)
    return success_response([a.__dict__ for a in analytics])


@router.get("/classes/{class_id}/activity")
async def class_activity(class_id: str, user: Teacher, db: DbSession):
    await MembershipService(db).get_class_for_user(user, class_id)
    result = await db.execute(
        select(ActivityEvent)
        .where(ActivityEvent.class_id == class_id)
        .order_by(ActivityEvent.created_at.desc())
        .limit(50)
    )
    return success_response(
        [
            {
                "id": e.id,
                "event_type": e.event_type,
                "user_id": e.user_id,
                "payload": e.payload,
                "created_at": e.created_at,
            }
            for e in result.scalars().all()
        ]
    )


@router.get("/classes/{class_id}/reports/overview")
async def reports_overview(class_id: str, user: Teacher, db: DbSession):
    data = await teacher_dashboard(class_id, user, db)
    return data


@router.get("/classes/{class_id}/reports/leaderboard")
async def reports_leaderboard(class_id: str, user: Teacher, db: DbSession):
    from app.api.v1.duels import leaderboard

    return await leaderboard(class_id, user, db)
