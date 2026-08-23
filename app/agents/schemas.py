from __future__ import annotations

from enum import StrEnum

from pydantic import BaseModel, Field, field_validator, model_validator


class QuestionType(StrEnum):
    SINGLE_CHOICE = "SINGLE_CHOICE"
    TRUE_FALSE = "TRUE_FALSE"


class Difficulty(StrEnum):
    EASY = "EASY"
    MEDIUM = "MEDIUM"
    HARD = "HARD"


class GeneratedOption(BaseModel):
    text: str = Field(min_length=1, max_length=500)
    is_correct: bool


class GeneratedQuestion(BaseModel):
    type: QuestionType
    prompt: str = Field(min_length=1, max_length=2000)
    options: list[GeneratedOption] = Field(min_length=2, max_length=6)
    explanation: str | None = Field(default=None, max_length=2000)
    points: int = Field(default=100, ge=1, le=1000)

    @field_validator("options")
    @classmethod
    def validate_option_count(cls, options: list[GeneratedOption], info) -> list[GeneratedOption]:
        question_type = info.data.get("type")
        if question_type == QuestionType.TRUE_FALSE and len(options) != 2:
            raise ValueError("TRUE_FALSE questions must have exactly 2 options")
        if question_type == QuestionType.SINGLE_CHOICE and len(options) < 2:
            raise ValueError("SINGLE_CHOICE questions must have at least 2 options")
        return options

    @model_validator(mode="after")
    def validate_correct_options(self) -> GeneratedQuestion:
        correct_count = sum(1 for option in self.options if option.is_correct)
        if correct_count != 1:
            raise ValueError("Each question must have exactly one correct option")
        if self.type == QuestionType.TRUE_FALSE:
            normalized = {option.text.strip().lower() for option in self.options}
            if not normalized.issubset({"true", "false", "yes", "no"}):
                pass
        return self


class GeneratedChallenge(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    questions: list[GeneratedQuestion] = Field(min_length=1, max_length=10)


class ChallengeGenerationRequest(BaseModel):
    subject_name: str = Field(min_length=1, max_length=120)
    topic_title: str = Field(min_length=1, max_length=200)
    topic_description: str | None = Field(default=None, max_length=4000)
    source_context: str | None = Field(default=None, max_length=8000)
    difficulty: Difficulty
    question_count: int = Field(default=5, ge=5, le=10)
    language: str = Field(default="English", min_length=2, max_length=40)
    run_id: str | None = None


class GenerationPlan(BaseModel):
    focus_areas: list[str] = Field(min_length=1, max_length=8)
    question_mix: dict[QuestionType, int]
    batch_size: int = Field(default=2, ge=1, le=5)
    notes: str | None = None

    @model_validator(mode="after")
    def validate_mix_totals(self) -> GenerationPlan:
        if sum(self.question_mix.values()) <= 0:
            raise ValueError("question_mix must allocate at least one question")
        return self


class ResearchBrief(BaseModel):
    learning_objectives: list[str] = Field(min_length=1, max_length=8)
    key_concepts: list[str] = Field(min_length=1, max_length=12)
    pitfalls: list[str] = Field(default_factory=list, max_length=6)
    vocabulary: list[str] = Field(default_factory=list, max_length=12)


class WriterBatchOutput(BaseModel):
    questions: list[GeneratedQuestion] = Field(min_length=1, max_length=5)


class SynthesizerOutput(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    questions: list[GeneratedQuestion] = Field(min_length=1, max_length=10)
