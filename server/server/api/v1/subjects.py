from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter
from sqlalchemy import select

from server.api.deps import CurrentUser, DbSession, require_roles
from server.api.schemas import (
    SubjectCreateBody,
    SubjectUpdateBody,
    TopicCreateBody,
    TopicUpdateBody,
)
from server.core.enums import ChallengeStatus, EntityStatus, MasteryCategory, UserRole
from server.core.errors import ERROR_CODES, AppError, success_response
from server.models.entities import Challenge, Subject, Topic, TopicProgress
from server.services.domain import MembershipService

router = APIRouter(tags=["subjects-topics"])
Teacher = Annotated[CurrentUser, require_roles(UserRole.TEACHER, UserRole.ADMIN)]


async def _ensure_subject_teacher(user: CurrentUser, db: DbSession, class_id: str) -> None:
    await MembershipService(db).ensure_class_teacher(user, class_id)


async def _subject_has_active_content(db: DbSession, subject_id: str) -> bool:
    active_topic = await db.execute(
        select(Topic.id)
        .where(Topic.subject_id == subject_id, Topic.status == EntityStatus.ACTIVE)
        .limit(1)
    )
    if active_topic.scalar_one_or_none() is not None:
        return True

    active_challenge = await db.execute(
        select(Challenge.id)
        .join(Topic, Topic.id == Challenge.topic_id)
        .where(
            Topic.subject_id == subject_id,
            Challenge.status.in_(
                [
                    ChallengeStatus.READY,
                    ChallengeStatus.PENDING,
                    ChallengeStatus.PROCESSING,
                ]
            ),
        )
        .limit(1)
    )
    return active_challenge.scalar_one_or_none() is not None


def _subject_out(
    subject: Subject,
    *,
    topics_count: int | None = None,
    average_mastery: float | None = None,
) -> dict:
    payload = {
        "id": subject.id,
        "class_id": subject.class_id,
        "name": subject.name,
        "description": subject.description,
        "icon_key": subject.icon_key,
        "status": subject.status,
    }
    if topics_count is not None:
        payload["topics_count"] = topics_count
    if average_mastery is not None:
        payload["average_mastery"] = average_mastery
    return payload


def _topic_out(topic: Topic, progress: TopicProgress | None = None) -> dict:
    return {
        "id": topic.id,
        "subject_id": topic.subject_id,
        "title": topic.title,
        "description": topic.description,
        "source_context": topic.source_context,
        "difficulty": topic.difficulty,
        "status": topic.status,
        "mastery_percent": progress.mastery_percent if progress else 0.0,
        "mastery_category": progress.mastery_category if progress else MasteryCategory.WEAK,
        "attempts_count": progress.attempts_count if progress else 0,
    }


@router.get("/classes/{class_id}/subjects")
async def list_subjects(class_id: str, user: CurrentUser, db: DbSession):
    await MembershipService(db).get_class_for_user(user, class_id)
    result = await db.execute(
        select(Subject).where(
            Subject.class_id == class_id,
            Subject.status == EntityStatus.ACTIVE,
        )
    )
    subjects = list(result.scalars().all())
    topic_counts: dict[str, int] = {}
    mastery_by_subject: dict[str, list[float]] = {}
    if subjects:
        count_result = await db.execute(
            select(Topic.subject_id, Topic.id).where(
                Topic.subject_id.in_([subject.id for subject in subjects]),
                Topic.status == EntityStatus.ACTIVE,
            )
        )
        topic_to_subject = {}
        for subject_id, topic_id in count_result.all():
            topic_counts[subject_id] = topic_counts.get(subject_id, 0) + 1
            topic_to_subject[topic_id] = subject_id
        if user.role == UserRole.STUDENT and topic_to_subject:
            progress_result = await db.execute(
                select(TopicProgress).where(
                    TopicProgress.user_id == user.id,
                    TopicProgress.topic_id.in_(topic_to_subject),
                )
            )
            for progress in progress_result.scalars().all():
                mastery_by_subject.setdefault(topic_to_subject[progress.topic_id], []).append(
                    progress.mastery_percent
                )
    return success_response(
        [
            _subject_out(
                subject,
                topics_count=topic_counts.get(subject.id, 0),
                average_mastery=round(
                    sum(mastery_by_subject.get(subject.id, []))
                    / max(1, topic_counts.get(subject.id, 0)),
                    2,
                )
                if user.role == UserRole.STUDENT
                else None,
            )
            for subject in subjects
        ]
    )


@router.post("/classes/{class_id}/subjects")
async def create_subject(class_id: str, body: SubjectCreateBody, user: Teacher, db: DbSession):
    await _ensure_subject_teacher(user, db, class_id)
    subject = Subject(
        class_id=class_id,
        name=body.name,
        description=body.description,
        icon_key=body.icon_key,
        created_by_id=user.id,
    )
    db.add(subject)
    await db.flush()
    return success_response(_subject_out(subject, topics_count=0))


@router.patch("/subjects/{subject_id}")
async def update_subject(subject_id: str, body: SubjectUpdateBody, user: Teacher, db: DbSession):
    subject = await db.get(Subject, subject_id)
    if subject is None:
        raise AppError(ERROR_CODES.SUBJECT_NOT_FOUND, "Subject not found", status_code=404)
    await _ensure_subject_teacher(user, db, subject.class_id)
    if body.name is not None:
        subject.name = body.name
    if body.description is not None:
        subject.description = body.description
    if body.icon_key is not None:
        subject.icon_key = body.icon_key
    await db.flush()
    return success_response(_subject_out(subject))


@router.delete("/subjects/{subject_id}")
async def archive_subject(subject_id: str, user: Teacher, db: DbSession):
    subject = await db.get(Subject, subject_id)
    if subject is None:
        raise AppError(ERROR_CODES.SUBJECT_NOT_FOUND, "Subject not found", status_code=404)
    await _ensure_subject_teacher(user, db, subject.class_id)
    if await _subject_has_active_content(db, subject_id):
        raise AppError(
            ERROR_CODES.SUBJECT_HAS_ACTIVE_CONTENT,
            "Subject has active content",
            status_code=409,
        )
    subject.status = EntityStatus.ARCHIVED
    await db.flush()
    return success_response({"archived": True})


@router.get("/subjects/{subject_id}/topics")
async def list_topics(subject_id: str, user: CurrentUser, db: DbSession):
    subject = await db.get(Subject, subject_id)
    if subject is None:
        raise AppError(ERROR_CODES.SUBJECT_NOT_FOUND, "Subject not found", status_code=404)
    await MembershipService(db).get_class_for_user(user, subject.class_id)
    query = select(Topic, TopicProgress).outerjoin(
        TopicProgress,
        (TopicProgress.topic_id == Topic.id) & (TopicProgress.user_id == user.id),
    )
    query = query.where(Topic.subject_id == subject_id, Topic.status == EntityStatus.ACTIVE)
    result = await db.execute(query.order_by(Topic.created_at.asc()))
    return success_response([_topic_out(topic, progress) for topic, progress in result.all()])


@router.post("/subjects/{subject_id}/topics")
async def create_topic(subject_id: str, body: TopicCreateBody, user: Teacher, db: DbSession):
    subject = await db.get(Subject, subject_id)
    if subject is None:
        raise AppError(ERROR_CODES.SUBJECT_NOT_FOUND, "Subject not found", status_code=404)
    await _ensure_subject_teacher(user, db, subject.class_id)
    topic = Topic(
        subject_id=subject_id,
        title=body.title,
        description=body.description,
        source_context=body.source_context,
        difficulty=body.difficulty,
        created_by_id=user.id,
    )
    db.add(topic)
    await db.flush()
    return success_response(_topic_out(topic))


@router.get("/topics/{topic_id}")
async def get_topic(topic_id: str, user: CurrentUser, db: DbSession):
    topic = await db.get(Topic, topic_id)
    if topic is None:
        raise AppError(ERROR_CODES.TOPIC_NOT_FOUND, "Topic not found", status_code=404)
    subject = await db.get(Subject, topic.subject_id)
    if subject is None:
        raise AppError(ERROR_CODES.SUBJECT_NOT_FOUND, "Subject not found", status_code=404)
    await MembershipService(db).get_class_for_user(user, subject.class_id)
    progress = None
    if user.role == UserRole.STUDENT:
        progress_result = await db.execute(
            select(TopicProgress).where(
                TopicProgress.user_id == user.id,
                TopicProgress.topic_id == topic_id,
            )
        )
        progress = progress_result.scalar_one_or_none()
    return success_response(_topic_out(topic, progress))


@router.patch("/topics/{topic_id}")
async def update_topic(topic_id: str, body: TopicUpdateBody, user: Teacher, db: DbSession):
    topic = await db.get(Topic, topic_id)
    if topic is None:
        raise AppError(ERROR_CODES.TOPIC_NOT_FOUND, "Topic not found", status_code=404)
    subject = await db.get(Subject, topic.subject_id)
    if subject is None:
        raise AppError(ERROR_CODES.SUBJECT_NOT_FOUND, "Subject not found", status_code=404)
    await _ensure_subject_teacher(user, db, subject.class_id)
    if body.title is not None:
        topic.title = body.title
    if body.description is not None:
        topic.description = body.description
    if body.source_context is not None:
        topic.source_context = body.source_context
    if body.difficulty is not None:
        topic.difficulty = body.difficulty
    await db.flush()
    return success_response(_topic_out(topic))


@router.delete("/topics/{topic_id}")
async def archive_topic(topic_id: str, user: Teacher, db: DbSession):
    topic = await db.get(Topic, topic_id)
    if topic is None:
        raise AppError(ERROR_CODES.TOPIC_NOT_FOUND, "Topic not found", status_code=404)
    subject = await db.get(Subject, topic.subject_id)
    if subject is None:
        raise AppError(ERROR_CODES.SUBJECT_NOT_FOUND, "Subject not found", status_code=404)
    await _ensure_subject_teacher(user, db, subject.class_id)
    topic.status = EntityStatus.ARCHIVED
    await db.flush()
    return success_response({"archived": True})
