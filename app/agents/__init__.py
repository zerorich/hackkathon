"""Multi-agent challenge generation for Maktab AI Arena."""

from app.agents.errors import AgentGenerationError
from app.agents.models import (
    AgentResult,
    AgentRole,
    AgentTask,
    AgentTaskStatus,
    ChallengeGenerationResult,
    GenerationMode,
    OrchestratorRun,
    OrchestratorStatus,
)
from app.agents.orchestrator import ChallengeOrchestrator, DEFAULT_MAX_CONCURRENCY
from app.agents.schemas import (
    ChallengeGenerationRequest,
    Difficulty,
    GeneratedChallenge,
    GeneratedOption,
    GeneratedQuestion,
    QuestionType,
)
from app.agents.service import (
    build_generation_request,
    generate_challenge,
    generate_challenge_fast,
    generate_challenge_or_raise,
)

__all__ = [
    "AgentGenerationError",
    "AgentResult",
    "AgentRole",
    "AgentTask",
    "AgentTaskStatus",
    "ChallengeGenerationRequest",
    "ChallengeGenerationResult",
    "ChallengeOrchestrator",
    "DEFAULT_MAX_CONCURRENCY",
    "Difficulty",
    "GeneratedChallenge",
    "GeneratedOption",
    "GeneratedQuestion",
    "GenerationMode",
    "OrchestratorRun",
    "OrchestratorStatus",
    "QuestionType",
    "build_generation_request",
    "generate_challenge",
    "generate_challenge_fast",
    "generate_challenge_or_raise",
]
