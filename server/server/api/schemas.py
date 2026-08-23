from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class APIModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class OtpRequestBody(BaseModel):
    identifier: str = Field(min_length=3, max_length=255)


class OtpVerifyBody(BaseModel):
    identifier: str = Field(min_length=3, max_length=255)
    code: str = Field(min_length=4, max_length=10)


class RefreshBody(BaseModel):
    refresh_token: str


class ProfileUpdateBody(BaseModel):
    display_name: str | None = Field(default=None, min_length=1, max_length=255)
    avatar_url: str | None = None
    onboarding_completed: bool | None = None


class UserOut(APIModel):
    id: str
    role: str
    identifier: str
    display_name: str
    avatar_url: str | None
    status: str
    onboarding_completed: bool


class AuthTokensOut(APIModel):
    access_token: str
    refresh_token: str
    token_type: str = "Bearer"
    user: UserOut


class ClassCreateBody(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    grade: str = Field(min_length=1, max_length=50)
    description: str | None = None


class ClassJoinBody(BaseModel):
    invite_code: str = Field(min_length=4, max_length=32)


class SubjectCreateBody(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str | None = None
    icon_key: str | None = None


class SubjectUpdateBody(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    icon_key: str | None = None


class TopicCreateBody(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None
    source_context: str | None = None
    difficulty: Literal["EASY", "MEDIUM", "HARD"] = "MEDIUM"


class TopicUpdateBody(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    source_context: str | None = None
    difficulty: Literal["EASY", "MEDIUM", "HARD"] | None = None


class ChallengeGenerateBody(BaseModel):
    difficulty: Literal["EASY", "MEDIUM", "HARD"] | None = None
    question_count: int | None = Field(default=None, ge=5, le=10)


class ManualOptionBody(BaseModel):
    text: str = Field(min_length=1, max_length=2000)
    is_correct: bool = False


class ManualQuestionBody(BaseModel):
    prompt: str = Field(min_length=1, max_length=10000)
    type: Literal["SINGLE_CHOICE", "TRUE_FALSE"] = "SINGLE_CHOICE"
    explanation: str | None = Field(default=None, max_length=10000)
    points: int = Field(default=1, ge=1, le=100)
    options: list[ManualOptionBody] = Field(min_length=2, max_length=10)


class ChallengeManualBody(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    difficulty: Literal["EASY", "MEDIUM", "HARD"] = "MEDIUM"
    questions: list[ManualQuestionBody] = Field(min_length=1, max_length=50)


class ChallengeStatusUpdateBody(BaseModel):
    status: Literal["READY", "ARCHIVED"]


class UserStatusUpdateBody(BaseModel):
    status: Literal["ACTIVE", "BLOCKED"]


class AdminChallengeStatusUpdateBody(BaseModel):
    status: Literal["READY", "ARCHIVED"]


class AnswerBody(BaseModel):
    selected_option_id: str


class OptionOut(APIModel):
    id: str
    order: int
    text: str


class OptionWithCorrectOut(OptionOut):
    is_correct: bool


class QuestionOut(APIModel):
    id: str
    order: int
    type: str
    prompt: str
    points: int
    options: list[OptionOut]


class QuestionResultOut(QuestionOut):
    explanation: str | None = None
    options: list[OptionWithCorrectOut]
    selected_option_id: str | None = None
    is_correct: bool | None = None


class ChallengeOut(APIModel):
    id: str
    topic_id: str
    title: str
    difficulty: str
    question_count: int
    status: str
    origin: str
    type: str
    created_at: datetime


class ChallengeDetailOut(ChallengeOut):
    questions: list[QuestionOut]


class AttemptOut(APIModel):
    id: str
    challenge_id: str
    status: str
    score: int | None = None
    correct_count: int | None = None
    total_questions: int | None = None
    accuracy_percent: float | None = None
    xp_awarded: int | None = None
    duration_seconds: int | None = None
    started_at: datetime
    completed_at: datetime | None = None


class AttemptResultOut(AttemptOut):
    questions: list[QuestionResultOut] = []


class DuelOut(APIModel):
    id: str
    share_code: str
    status: str
    challenge_id: str
    creator_id: str
    opponent_id: str | None = None
    winner_id: str | None = None
    expires_at: datetime
    completed_at: datetime | None = None


class DashboardOut(APIModel):
    stats: dict[str, Any]
    recent_attempts: list[AttemptOut]
    streak: int
    level: int
    total_xp: int


class LeaderboardOut(APIModel):
    period: str
    entries: list[dict[str, Any]]
