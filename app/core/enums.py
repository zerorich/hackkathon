from __future__ import annotations

from enum import StrEnum


class UserRole(StrEnum):
    STUDENT = "STUDENT"
    TEACHER = "TEACHER"
    ADMIN = "ADMIN"


class UserStatus(StrEnum):
    ACTIVE = "ACTIVE"
    BLOCKED = "BLOCKED"


class ClassStatus(StrEnum):
    ACTIVE = "ACTIVE"
    ARCHIVED = "ARCHIVED"


class MembershipRole(StrEnum):
    STUDENT = "STUDENT"
    TEACHER = "TEACHER"


class MembershipStatus(StrEnum):
    ACTIVE = "ACTIVE"
    REMOVED = "REMOVED"


class EntityStatus(StrEnum):
    ACTIVE = "ACTIVE"
    ARCHIVED = "ARCHIVED"


class Difficulty(StrEnum):
    EASY = "EASY"
    MEDIUM = "MEDIUM"
    HARD = "HARD"


class ChallengeOrigin(StrEnum):
    AI = "AI"
    TEACHER = "TEACHER"
    SYSTEM = "SYSTEM"


class ChallengeType(StrEnum):
    AI_PRACTICE = "AI_PRACTICE"
    TEACHER_ASSIGNMENT = "TEACHER_ASSIGNMENT"
    DUEL_BASE = "DUEL_BASE"


class ChallengeStatus(StrEnum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    READY = "READY"
    FAILED = "FAILED"
    ARCHIVED = "ARCHIVED"


class QuestionType(StrEnum):
    SINGLE_CHOICE = "SINGLE_CHOICE"
    TRUE_FALSE = "TRUE_FALSE"


class AttemptStatus(StrEnum):
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    ABANDONED = "ABANDONED"


class DuelStatus(StrEnum):
    PENDING = "PENDING"
    ACCEPTED = "ACCEPTED"
    COMPLETED = "COMPLETED"
    EXPIRED = "EXPIRED"
    CANCELLED = "CANCELLED"


class AiJobStatus(StrEnum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class MasteryCategory(StrEnum):
    WEAK = "WEAK"
    LEARNING = "LEARNING"
    GOOD = "GOOD"
    MASTERED = "MASTERED"


class XpSourceType(StrEnum):
    ATTEMPT = "ATTEMPT"
    DUEL_WIN = "DUEL_WIN"
    BONUS = "BONUS"
    ADMIN_ADJUSTMENT = "ADMIN_ADJUSTMENT"


class ActivityEventType(StrEnum):
    ATTEMPT_COMPLETED = "ATTEMPT_COMPLETED"
    DUEL_COMPLETED = "DUEL_COMPLETED"
    CHALLENGE_CREATED = "CHALLENGE_CREATED"
    MEMBER_JOINED = "MEMBER_JOINED"
