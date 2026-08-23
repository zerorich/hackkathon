from __future__ import annotations

import secrets
import uuid
from datetime import date, datetime, timedelta, timezone
from typing import TYPE_CHECKING

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from server.core.enums import (
    ActivityEventType,
    AiJobStatus,
    AttemptStatus,
    ChallengeOrigin,
    ChallengeStatus,
    ChallengeType,
    ClassStatus,
    Difficulty,
    DuelStatus,
    EntityStatus,
    MasteryCategory,
    MembershipRole,
    MembershipStatus,
    QuestionType,
    UserRole,
    UserStatus,
    XpSourceType,
)
from server.db.base import Base

if TYPE_CHECKING:
    pass


def utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def new_uuid() -> str:
    return str(uuid.uuid4())


def generate_invite_code() -> str:
    return secrets.token_hex(4).upper()


def generate_share_code() -> str:
    return secrets.token_urlsafe(8)


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    role: Mapped[str] = mapped_column(String(20), default=UserRole.STUDENT)
    identifier: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    display_name: Mapped[str] = mapped_column(String(255))
    avatar_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default=UserStatus.ACTIVE)
    onboarding_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )

    memberships: Mapped[list[ClassMembership]] = relationship(back_populates="user")
    attempts: Mapped[list[Attempt]] = relationship(back_populates="user")
    stats: Mapped[list[StudentStats]] = relationship(back_populates="user")


class OtpChallenge(Base):
    __tablename__ = "otp_challenges"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    identifier: Mapped[str] = mapped_column(String(255), index=True)
    code_hash: Mapped[str] = mapped_column(String(255))
    purpose: Mapped[str] = mapped_column(String(50), default="LOGIN")
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    attempts_count: Mapped[int] = mapped_column(Integer, default=0)
    consumed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class RefreshSession(Base):
    __tablename__ = "refresh_sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    token_hash: Mapped[str] = mapped_column(String(255), unique=True)
    family_id: Mapped[str] = mapped_column(String(36), index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    replaced_by_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    last_used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(String(512), nullable=True)
    ip_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)


class SchoolClass(Base):
    __tablename__ = "school_classes"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    name: Mapped[str] = mapped_column(String(255))
    grade: Mapped[str] = mapped_column(String(50))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    invite_code: Mapped[str] = mapped_column(String(32), unique=True, default=generate_invite_code)
    status: Mapped[str] = mapped_column(String(20), default=ClassStatus.ACTIVE)
    created_by_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )

    memberships: Mapped[list[ClassMembership]] = relationship(back_populates="school_class")
    subjects: Mapped[list[Subject]] = relationship(back_populates="school_class")


class ClassMembership(Base):
    __tablename__ = "class_memberships"
    __table_args__ = (UniqueConstraint("class_id", "user_id", name="uq_class_user"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    class_id: Mapped[str] = mapped_column(ForeignKey("school_classes.id"), index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    role: Mapped[str] = mapped_column(String(20), default=MembershipRole.STUDENT)
    status: Mapped[str] = mapped_column(String(20), default=MembershipStatus.ACTIVE)
    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    school_class: Mapped[SchoolClass] = relationship(back_populates="memberships")
    user: Mapped[User] = relationship(back_populates="memberships")


class Subject(Base):
    __tablename__ = "subjects"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    class_id: Mapped[str] = mapped_column(ForeignKey("school_classes.id"), index=True)
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    icon_key: Mapped[str | None] = mapped_column(String(64), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default=EntityStatus.ACTIVE)
    created_by_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )

    school_class: Mapped[SchoolClass] = relationship(back_populates="subjects")
    topics: Mapped[list[Topic]] = relationship(back_populates="subject")


class Topic(Base):
    __tablename__ = "topics"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    subject_id: Mapped[str] = mapped_column(ForeignKey("subjects.id"), index=True)
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    source_context: Mapped[str | None] = mapped_column(Text, nullable=True)
    difficulty: Mapped[str] = mapped_column(String(20), default=Difficulty.MEDIUM)
    status: Mapped[str] = mapped_column(String(20), default=EntityStatus.ACTIVE)
    created_by_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )

    subject: Mapped[Subject] = relationship(back_populates="topics")
    challenges: Mapped[list[Challenge]] = relationship(back_populates="topic")


class Challenge(Base):
    __tablename__ = "challenges"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    topic_id: Mapped[str] = mapped_column(ForeignKey("topics.id"), index=True)
    created_by_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    origin: Mapped[str] = mapped_column(String(20), default=ChallengeOrigin.AI)
    type: Mapped[str] = mapped_column(String(30), default=ChallengeType.AI_PRACTICE)
    title: Mapped[str] = mapped_column(String(255))
    difficulty: Mapped[str] = mapped_column(String(20), default=Difficulty.MEDIUM)
    question_count: Mapped[int] = mapped_column(Integer, default=5)
    status: Mapped[str] = mapped_column(String(20), default=ChallengeStatus.PENDING)
    generation_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )

    topic: Mapped[Topic] = relationship(back_populates="challenges")
    questions: Mapped[list[Question]] = relationship(
        back_populates="challenge", order_by="Question.order"
    )
    attempts: Mapped[list[Attempt]] = relationship(back_populates="challenge")


class Question(Base):
    __tablename__ = "questions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    challenge_id: Mapped[str] = mapped_column(ForeignKey("challenges.id"), index=True)
    order: Mapped[int] = mapped_column(Integer)
    type: Mapped[str] = mapped_column(String(20), default=QuestionType.SINGLE_CHOICE)
    prompt: Mapped[str] = mapped_column(Text)
    explanation: Mapped[str | None] = mapped_column(Text, nullable=True)
    points: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    challenge: Mapped[Challenge] = relationship(back_populates="questions")
    options: Mapped[list[QuestionOption]] = relationship(
        back_populates="question", order_by="QuestionOption.order"
    )


class QuestionOption(Base):
    __tablename__ = "question_options"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    question_id: Mapped[str] = mapped_column(ForeignKey("questions.id"), index=True)
    order: Mapped[int] = mapped_column(Integer)
    text: Mapped[str] = mapped_column(Text)
    is_correct: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    question: Mapped[Question] = relationship(back_populates="options")


class Attempt(Base):
    __tablename__ = "attempts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    challenge_id: Mapped[str] = mapped_column(ForeignKey("challenges.id"), index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    class_id: Mapped[str] = mapped_column(ForeignKey("school_classes.id"), index=True)
    status: Mapped[str] = mapped_column(String(20), default=AttemptStatus.IN_PROGRESS)
    score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    correct_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    incorrect_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    total_questions: Mapped[int | None] = mapped_column(Integer, nullable=True)
    duel_id: Mapped[str | None] = mapped_column(ForeignKey("duels.id"), nullable=True)
    accuracy_percent: Mapped[float | None] = mapped_column(Float, nullable=True)
    xp_awarded: Mapped[int | None] = mapped_column(Integer, nullable=True)
    duration_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )

    challenge: Mapped[Challenge] = relationship(back_populates="attempts")
    user: Mapped[User] = relationship(back_populates="attempts")
    answers: Mapped[list[AttemptAnswer]] = relationship(back_populates="attempt")


class AttemptAnswer(Base):
    __tablename__ = "attempt_answers"
    __table_args__ = (UniqueConstraint("attempt_id", "question_id", name="uq_attempt_question"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    attempt_id: Mapped[str] = mapped_column(ForeignKey("attempts.id"), index=True)
    question_id: Mapped[str] = mapped_column(ForeignKey("questions.id"), index=True)
    selected_option_id: Mapped[str] = mapped_column(ForeignKey("question_options.id"))
    is_correct: Mapped[bool] = mapped_column(Boolean, default=False)
    awarded_points: Mapped[int | None] = mapped_column(Integer, nullable=True)
    answered_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    attempt: Mapped[Attempt] = relationship(back_populates="answers")


class Duel(Base):
    __tablename__ = "duels"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    share_code: Mapped[str] = mapped_column(String(32), unique=True, default=generate_share_code)
    class_id: Mapped[str] = mapped_column(ForeignKey("school_classes.id"), index=True)
    challenge_id: Mapped[str] = mapped_column(ForeignKey("challenges.id"), index=True)
    creator_attempt_id: Mapped[str] = mapped_column(ForeignKey("attempts.id"))
    creator_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    opponent_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    opponent_attempt_id: Mapped[str | None] = mapped_column(
        ForeignKey("attempts.id"), nullable=True
    )
    status: Mapped[str] = mapped_column(String(20), default=DuelStatus.PENDING)
    winner_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    result_type: Mapped[str | None] = mapped_column(String(30), nullable=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    accepted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=True
    )


class StudentStats(Base):
    __tablename__ = "student_stats"
    __table_args__ = (UniqueConstraint("user_id", "class_id", name="uq_user_class_stats"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    class_id: Mapped[str] = mapped_column(ForeignKey("school_classes.id"), index=True)
    total_xp: Mapped[int] = mapped_column(Integer, default=0)
    level: Mapped[int] = mapped_column(Integer, default=1)
    streak: Mapped[int] = mapped_column(Integer, default=0)
    best_streak: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    last_activity_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    attempts_completed: Mapped[int] = mapped_column(Integer, default=0)
    total_correct_answers: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    total_answers: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    average_accuracy: Mapped[float] = mapped_column(Float, default=0.0, server_default="0")
    last_attempt_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    duels_won: Mapped[int] = mapped_column(Integer, default=0)
    duels_lost: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    duels_drawn: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )

    user: Mapped[User] = relationship(back_populates="stats")


class TopicProgress(Base):
    __tablename__ = "topic_progress"
    __table_args__ = (UniqueConstraint("user_id", "topic_id", name="uq_user_topic_progress"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    topic_id: Mapped[str] = mapped_column(ForeignKey("topics.id"), index=True)
    mastery_percent: Mapped[float] = mapped_column(Float, default=0.0)
    mastery_category: Mapped[str] = mapped_column(String(20), default=MasteryCategory.WEAK)
    attempts_count: Mapped[int] = mapped_column(Integer, default=0)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )


class XpLedger(Base):
    __tablename__ = "xp_ledger"
    __table_args__ = (
        UniqueConstraint("user_id", "source_type", "source_id", name="uq_xp_source"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    class_id: Mapped[str] = mapped_column(ForeignKey("school_classes.id"), index=True)
    source_type: Mapped[str] = mapped_column(String(30))
    source_id: Mapped[str] = mapped_column(String(36))
    amount: Mapped[int] = mapped_column(Integer)
    balance_after: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class AiGenerationJob(Base):
    __tablename__ = "ai_generation_jobs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    challenge_id: Mapped[str] = mapped_column(ForeignKey("challenges.id"), unique=True)
    requested_by_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    provider: Mapped[str | None] = mapped_column(String(64), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default=AiJobStatus.PENDING)
    error_code: Mapped[str | None] = mapped_column(String(64), nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    retry_count: Mapped[int] = mapped_column(Integer, default=0)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class ActivityEvent(Base):
    __tablename__ = "activity_events"
    __table_args__ = (Index("ix_activity_class_created", "class_id", "created_at"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    class_id: Mapped[str] = mapped_column(ForeignKey("school_classes.id"), index=True)
    user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    event_type: Mapped[str] = mapped_column(String(50))
    entity_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    entity_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    payload: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


def duel_expires_at(hours: int = 24) -> datetime:
    return utcnow() + timedelta(hours=hours)
