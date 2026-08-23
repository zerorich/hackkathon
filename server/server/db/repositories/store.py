from __future__ import annotations

import json
from datetime import date, datetime
from uuid import UUID

from sqlalchemy import Select, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from server.core.enums import (
    AttemptStatus,
    ClassStatus,
    EntityStatus,
    MembershipStatus,
    UserStatus,
)
from server.models import (
    ActivityEvent,
    Attempt,
    AttemptAnswer,
    Challenge,
    ClassMembership,
    Duel,
    Question,
    SchoolClass,
    StudentStats,
    Subject,
    Topic,
    TopicProgress,
    User,
    XpLedger,
)


class Store:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    # --- users ---
    async def get_user(self, user_id: str | UUID) -> User | None:
        return await self.session.get(User, str(user_id))

    async def get_user_by_identifier(self, identifier: str) -> User | None:
        result = await self.session.execute(select(User).where(User.identifier == identifier))
        return result.scalar_one_or_none()

    async def add_user(self, user: User) -> User:
        self.session.add(user)
        await self.session.flush()
        return user

    # --- classes ---
    async def get_class(self, class_id: str | UUID) -> SchoolClass | None:
        return await self.session.get(SchoolClass, str(class_id))

    async def get_class_by_invite(self, invite_code: str) -> SchoolClass | None:
        result = await self.session.execute(
            select(SchoolClass).where(SchoolClass.invite_code == invite_code.upper())
        )
        return result.scalar_one_or_none()

    async def list_classes_for_user(self, user_id: str | UUID) -> list[SchoolClass]:
        uid = str(user_id)
        result = await self.session.execute(
            select(SchoolClass)
            .join(ClassMembership, ClassMembership.class_id == SchoolClass.id)
            .where(
                ClassMembership.user_id == uid,
                ClassMembership.status == MembershipStatus.ACTIVE,
            )
            .order_by(SchoolClass.created_at.desc())
        )
        return list(result.scalars().all())

    async def add_class(self, school_class: SchoolClass) -> SchoolClass:
        self.session.add(school_class)
        await self.session.flush()
        return school_class

    # --- membership ---
    async def get_membership(self, class_id: str, user_id: str) -> ClassMembership | None:
        result = await self.session.execute(
            select(ClassMembership).where(
                ClassMembership.class_id == class_id,
                ClassMembership.user_id == user_id,
            )
        )
        return result.scalar_one_or_none()

    async def list_memberships(self, class_id: str) -> list[ClassMembership]:
        result = await self.session.execute(
            select(ClassMembership)
            .options(selectinload(ClassMembership.user))
            .where(
                ClassMembership.class_id == class_id,
                ClassMembership.status == MembershipStatus.ACTIVE,
            )
        )
        return list(result.scalars().all())

    async def is_active_member(self, class_id: str, user_id: str) -> bool:
        membership = await self.get_membership(class_id, user_id)
        return membership is not None and membership.status == MembershipStatus.ACTIVE

    async def is_teacher_of_class(self, class_id: str, user_id: str) -> bool:
        membership = await self.get_membership(class_id, user_id)
        return (
            membership is not None
            and membership.status == MembershipStatus.ACTIVE
            and membership.role == "TEACHER"
        )

    # --- curriculum ---
    async def get_subject(self, subject_id: str) -> Subject | None:
        return await self.session.get(Subject, subject_id)

    async def list_subjects(self, class_id: str, *, active_only: bool = True) -> list[Subject]:
        stmt = select(Subject).where(Subject.class_id == class_id)
        if active_only:
            stmt = stmt.where(Subject.status == EntityStatus.ACTIVE)
        stmt = stmt.order_by(Subject.name)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_topic(self, topic_id: str) -> Topic | None:
        return await self.session.get(Topic, topic_id)

    async def list_topics(self, subject_id: str, *, active_only: bool = True) -> list[Topic]:
        stmt = select(Topic).where(Topic.subject_id == subject_id)
        if active_only:
            stmt = stmt.where(Topic.status == EntityStatus.ACTIVE)
        stmt = stmt.order_by(Topic.title)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_topic_with_subject(self, topic_id: str) -> Topic | None:
        result = await self.session.execute(
            select(Topic).options(selectinload(Topic.subject)).where(Topic.id == topic_id)
        )
        return result.scalar_one_or_none()

    # --- challenges ---
    async def get_challenge(self, challenge_id: str) -> Challenge | None:
        result = await self.session.execute(
            select(Challenge)
            .options(
                selectinload(Challenge.questions).selectinload(Question.options),
                selectinload(Challenge.topic).selectinload(Topic.subject),
            )
            .where(Challenge.id == challenge_id)
        )
        return result.scalar_one_or_none()

    async def list_challenges(self, topic_id: str) -> list[Challenge]:
        result = await self.session.execute(
            select(Challenge)
            .where(Challenge.topic_id == topic_id)
            .order_by(Challenge.created_at.desc())
        )
        return list(result.scalars().all())

    # --- attempts ---
    async def get_attempt(self, attempt_id: str) -> Attempt | None:
        result = await self.session.execute(
            select(Attempt)
            .options(
                selectinload(Attempt.answers),
                selectinload(Attempt.challenge)
                .selectinload(Challenge.questions)
                .selectinload(Question.options),
            )
            .where(Attempt.id == attempt_id)
        )
        return result.scalar_one_or_none()

    async def get_answer(self, attempt_id: str, question_id: str) -> AttemptAnswer | None:
        result = await self.session.execute(
            select(AttemptAnswer).where(
                AttemptAnswer.attempt_id == attempt_id,
                AttemptAnswer.question_id == question_id,
            )
        )
        return result.scalar_one_or_none()

    async def recent_attempt_accuracies(
        self, user_id: str, topic_id: str, limit: int = 5
    ) -> list[float]:
        result = await self.session.execute(
            select(Attempt.accuracy_percent)
            .join(Challenge, Challenge.id == Attempt.challenge_id)
            .where(
                Attempt.user_id == user_id,
                Challenge.topic_id == topic_id,
                Attempt.status == AttemptStatus.COMPLETED,
                Attempt.accuracy_percent.is_not(None),
            )
            .order_by(Attempt.completed_at.desc())
            .limit(limit)
        )
        rows = result.scalars().all()
        return [float(a) for a in rows if a is not None]

    # --- duels ---
    async def get_duel(self, duel_id: str) -> Duel | None:
        return await self.session.get(Duel, duel_id)

    async def get_duel_by_share_code(self, share_code: str) -> Duel | None:
        result = await self.session.execute(select(Duel).where(Duel.share_code == share_code))
        return result.scalar_one_or_none()

    async def get_duel_for_attempt(self, attempt_id: str) -> Duel | None:
        result = await self.session.execute(
            select(Duel).where(
                or_(
                    Duel.creator_attempt_id == attempt_id,
                    Duel.opponent_attempt_id == attempt_id,
                )
            )
        )
        return result.scalar_one_or_none()

    async def list_duels_for_user(self, user_id: str) -> list[Duel]:
        result = await self.session.execute(
            select(Duel)
            .where(or_(Duel.creator_id == user_id, Duel.opponent_id == user_id))
            .order_by(Duel.created_at.desc())
        )
        return list(result.scalars().all())

    # --- stats ---
    async def get_student_stats(self, user_id: str, class_id: str) -> StudentStats | None:
        result = await self.session.execute(
            select(StudentStats).where(
                StudentStats.user_id == user_id,
                StudentStats.class_id == class_id,
            )
        )
        return result.scalar_one_or_none()

    async def ensure_student_stats(self, user_id: str, class_id: str) -> StudentStats:
        stats = await self.get_student_stats(user_id, class_id)
        if stats is None:
            stats = StudentStats(user_id=user_id, class_id=class_id)
            self.session.add(stats)
            await self.session.flush()
        return stats

    async def get_topic_progress(self, user_id: str, topic_id: str) -> TopicProgress | None:
        result = await self.session.execute(
            select(TopicProgress).where(
                TopicProgress.user_id == user_id,
                TopicProgress.topic_id == topic_id,
            )
        )
        return result.scalar_one_or_none()

    async def ensure_topic_progress(self, user_id: str, topic_id: str) -> TopicProgress:
        progress = await self.get_topic_progress(user_id, topic_id)
        if progress is None:
            progress = TopicProgress(user_id=user_id, topic_id=topic_id)
            self.session.add(progress)
            await self.session.flush()
        return progress

    async def list_class_stats(self, class_id: str) -> list[StudentStats]:
        result = await self.session.execute(
            select(StudentStats)
            .options(selectinload(StudentStats.user))
            .where(StudentStats.class_id == class_id)
            .order_by(StudentStats.total_xp.desc())
        )
        return list(result.scalars().all())

    async def xp_exists(self, user_id: str, source_type: str, source_id: str) -> bool:
        result = await self.session.execute(
            select(XpLedger.id).where(
                XpLedger.user_id == user_id,
                XpLedger.source_type == source_type,
                XpLedger.source_id == source_id,
            )
        )
        return result.scalar_one_or_none() is not None

    async def sum_xp_since(self, user_id: str, class_id: str, since: datetime) -> int:
        result = await self.session.execute(
            select(func.coalesce(func.sum(XpLedger.amount), 0)).where(
                XpLedger.user_id == user_id,
                XpLedger.class_id == class_id,
                XpLedger.created_at >= since,
            )
        )
        return int(result.scalar_one())

    async def list_topic_progress(
        self, user_id: str, *, subject_id: str | None = None
    ) -> list[TopicProgress]:
        stmt: Select[tuple[TopicProgress]] = (
            select(TopicProgress)
            .join(Topic, Topic.id == TopicProgress.topic_id)
            .where(TopicProgress.user_id == user_id)
        )
        if subject_id:
            stmt = stmt.where(Topic.subject_id == subject_id)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    # --- activity ---
    async def list_activity(
        self, class_id: str, *, limit: int = 50, before: datetime | None = None
    ) -> list[ActivityEvent]:
        stmt = select(ActivityEvent).where(ActivityEvent.class_id == class_id)
        if before is not None:
            stmt = stmt.where(ActivityEvent.created_at < before)
        stmt = stmt.order_by(ActivityEvent.created_at.desc()).limit(limit)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def log_activity(
        self,
        *,
        class_id: str,
        user_id: str | None,
        event_type: str,
        payload: dict | None = None,
    ) -> ActivityEvent:
        event = ActivityEvent(
            class_id=class_id,
            user_id=user_id,
            event_type=event_type,
            payload=json.dumps(payload or {}),
        )
        self.session.add(event)
        await self.session.flush()
        return event

    # --- helpers ---
    async def resolve_class_id_for_topic(self, topic_id: str) -> str | None:
        topic = await self.get_topic_with_subject(topic_id)
        if topic is None or topic.subject is None:
            return None
        return topic.subject.class_id

    async def assert_class_active(self, class_id: str) -> SchoolClass:
        school_class = await self.get_class(class_id)
        if school_class is None:
            from server.core.errors import ERROR_CODES, AppError

            raise AppError(ERROR_CODES.CLASS_NOT_FOUND, "Class not found", status_code=404)
        if school_class.status == ClassStatus.ARCHIVED:
            from server.core.errors import ERROR_CODES, AppError

            raise AppError(ERROR_CODES.CLASS_ARCHIVED, "Class is archived", status_code=403)
        return school_class

    async def assert_member(self, class_id: str, user_id: str) -> ClassMembership:
        membership = await self.get_membership(class_id, str(user_id))
        if membership is None or membership.status != MembershipStatus.ACTIVE:
            from server.core.errors import ERROR_CODES, AppError

            raise AppError(ERROR_CODES.CLASS_ACCESS_DENIED, "Class access denied", status_code=403)
        return membership

    async def assert_user_active(self, user_id: str) -> User:
        user = await self.get_user(user_id)
        if user is None:
            from server.core.errors import ERROR_CODES, AppError

            raise AppError(ERROR_CODES.NOT_FOUND, "User not found", status_code=404)
        if user.status == UserStatus.BLOCKED:
            from server.core.errors import ERROR_CODES, AppError

            raise AppError(ERROR_CODES.USER_BLOCKED, "User is blocked", status_code=403)
        return user

    @staticmethod
    def activity_date_today(timezone_name: str) -> date:
        from zoneinfo import ZoneInfo

        from server.models import utcnow

        now = utcnow()
        if now.tzinfo is None:
            now = now.replace(tzinfo=ZoneInfo("UTC"))
        return now.astimezone(ZoneInfo(timezone_name)).date()
