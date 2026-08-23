from __future__ import annotations

from datetime import UTC, datetime
from enum import StrEnum
from typing import Any
from uuid import uuid4

from pydantic import BaseModel, Field

from app.agents.schemas import (
    ChallengeGenerationRequest,
    GeneratedChallenge,
    GenerationPlan,
    ResearchBrief,
)


class AgentRole(StrEnum):
    PLANNER = "planner"
    RESEARCHER = "researcher"
    QUESTION_WRITER = "question_writer"
    CRITIC = "critic"
    SYNTHESIZER = "synthesizer"


class GenerationMode(StrEnum):
    FAST = "fast"
    DEEP = "deep"


class AgentTaskStatus(StrEnum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class OrchestratorStatus(StrEnum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class AgentTask(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    run_id: str
    role: AgentRole
    name: str
    depends_on: list[str] = Field(default_factory=list)
    status: AgentTaskStatus = AgentTaskStatus.PENDING
    input_payload: dict[str, Any] = Field(default_factory=dict)
    retry_count: int = 0
    max_retries: int = 1


class AgentResult(BaseModel):
    task_id: str
    run_id: str
    role: AgentRole
    success: bool
    output: dict[str, Any] | None = None
    error: str | None = None
    latency_ms: int = 0
    tokens_used: int | None = None
    cancelled: bool = False


class OrchestratorRun(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    status: OrchestratorStatus = OrchestratorStatus.PENDING
    mode: GenerationMode = GenerationMode.DEEP
    request: ChallengeGenerationRequest
    plan: GenerationPlan | None = None
    research: ResearchBrief | None = None
    tasks: list[AgentTask] = Field(default_factory=list)
    results: list[AgentResult] = Field(default_factory=list)
    challenge: GeneratedChallenge | None = None
    validation_errors: list[str] = Field(default_factory=list)
    started_at: datetime | None = None
    finished_at: datetime | None = None
    error_code: str | None = None
    error_message: str | None = None

    @property
    def duration_ms(self) -> int | None:
        if self.started_at is None or self.finished_at is None:
            return None
        return int((self.finished_at - self.started_at).total_seconds() * 1000)


class ChallengeGenerationResult(BaseModel):
    run: OrchestratorRun
    challenge: GeneratedChallenge | None = None
    success: bool
    used_fallback: bool = False
