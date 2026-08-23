from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter
from sqlalchemy import select

from app.api.deps import CurrentUser, DbSession, require_roles
from app.api.schemas import SubjectCreateBody, SubjectUpdateBody, TopicCreateBody, TopicUpdateBody
from app.core.errors import AppError, ERROR_CODES, success_response
from app.core.enums import ChallengeStatus, EntityStatus, MasteryCategory, UserRole
from app.models.entities import Challenge, Subject, Topic, TopicProgress
from app.services.domain import MembershipService

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


@router.get("/classes/{class_id}/subjects")
async def list_subjects(class_id: str, user: CurrentUser, db: DbSession):
    await MembershipService(db).get_class_for_user(user, class_id)
    result = await db.execute(
        select(Subject).where(
            Subject.class_id == class_id,
            Subject.status == EntityStatus.ACTIVE,
        )
    )
    return success_response(
        [
            {"id": s.id, "name": s.name, "description": s.description, "icon_key": s.icon_key}
            for s in result.scalars().all()
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
    return success_response({"id": subject.id, "name": subject.name})


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
    return success_response({"id": subject.id, "name": subject.name})


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
    result = await db.execute(
        select(Topic).where(Topic.subject_id == subject_id, Topic.status == EntityStatus.ACTIVE)
    )
    return success_response(
        [
            {
                "id": t.id,
                "title": t.title,
                "description": t.description,
                "difficulty": t.difficulty,
            }
            for t in result.scalars().all()
        ]
    )


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
    return success_response({"id": topic.id, "title": topic.title})


@router.get("/topics/{topic_id}")
async def get_topic(topic_id: str, user: CurrentUser, db: DbSession):
    topic = await db.get(Topic, topic_id)
    if topic is None:
        raise AppError(ERROR_CODES.TOPIC_NOT_FOUND, "Topic not found", status_code=404)
    subject = await db.get(Subject, topic.subject_id)
    if subject is None:
        raise AppError(ERROR_CODES.SUBJECT_NOT_FOUND, "Subject not found", status_code=404)
    await MembershipService(db).get_class_for_user(user, subject.class_id)
    payload = {
        "id": topic.id,
        "title": topic.title,
        "description": topic.description,
        "difficulty": topic.difficulty,
        "source_context": topic.source_context,
    }
    if user.role == UserRole.STUDENT:
        progress_result = await db.execute(
            select(TopicProgress).where(
                TopicProgress.user_id == user.id,
                TopicProgress.topic_id == topic_id,
            )
        )
        progress = progress_result.scalar_one_or_none()
        payload["mastery_percent"] = progress.mastery_percent if progress else 0.0
        payload["mastery_category"] = progress.mastery_category if progress else MasteryCategory.WEAK
        payload["attempts_count"] = progress.attempts_count if progress else 0
    return success_response(payload)


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
    return success_response({"id": topic.id, "title": topic.title})


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
