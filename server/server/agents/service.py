from __future__ import annotations

from server.agents.ai_adapter import AIClient
from server.agents.errors import AgentGenerationError
from server.agents.models import (
    AgentResult,
    AgentRole,
    AgentTask,
    ChallengeGenerationResult,
    GenerationMode,
    OrchestratorRun,
)
from server.agents.orchestrator import DEFAULT_MAX_CONCURRENCY, ChallengeOrchestrator
from server.agents.schemas import ChallengeGenerationRequest, Difficulty, GeneratedChallenge


async def generate_challenge(
    request: ChallengeGenerationRequest,
    *,
    mode: GenerationMode = GenerationMode.DEEP,
    ai_client: AIClient | None = None,
    max_concurrency: int = DEFAULT_MAX_CONCURRENCY,
) -> ChallengeGenerationResult:
    """Primary entry point for Agent 3/workers: multi-agent challenge generation."""
    orchestrator = ChallengeOrchestrator(max_concurrency=max_concurrency)
    return await orchestrator.run(request, mode=mode, ai_client=ai_client)


async def generate_challenge_fast(
    request: ChallengeGenerationRequest,
    *,
    ai_client: AIClient | None = None,
) -> ChallengeGenerationResult:
    """Cheap single-call path for low-latency generation attempts."""
    return await generate_challenge(
        request,
        mode=GenerationMode.FAST,
        ai_client=ai_client,
        max_concurrency=1,
    )


async def generate_challenge_or_raise(
    request: ChallengeGenerationRequest,
    *,
    mode: GenerationMode = GenerationMode.DEEP,
    ai_client: AIClient | None = None,
) -> GeneratedChallenge:
    """Returns a validated challenge or raises AppError for API layers."""
    result = await generate_challenge(request, mode=mode, ai_client=ai_client)
    if result.success and result.challenge is not None:
        return result.challenge

    code = "AI_OUTPUT_INVALID"
    message = result.run.error_message or "Challenge generation failed"
    if result.run.error_code == "AI_PROVIDER_UNAVAILABLE":
        code = "AI_PROVIDER_UNAVAILABLE"
        message = "AI provider unavailable"
    raise AgentGenerationError(
        code,
        message,
        details={"run_id": result.run.id, "errors": result.run.validation_errors},
    )


def build_generation_request(
    *,
    subject_name: str,
    topic_title: str,
    difficulty: Difficulty | str,
    question_count: int = 5,
    topic_description: str | None = None,
    source_context: str | None = None,
    language: str = "English",
    run_id: str | None = None,
) -> ChallengeGenerationRequest:
    """Helper for Agent 3 to construct a typed generation request."""
    parsed_difficulty = difficulty if isinstance(difficulty, Difficulty) else Difficulty(difficulty)
    return ChallengeGenerationRequest(
        subject_name=subject_name,
        topic_title=topic_title,
        topic_description=topic_description,
        source_context=source_context,
        difficulty=parsed_difficulty,
        question_count=question_count,
        language=language,
        run_id=run_id,
    )


__all__ = [
    "AgentGenerationError",
    "AgentResult",
    "AgentRole",
    "AgentTask",
    "ChallengeGenerationRequest",
    "ChallengeGenerationResult",
    "ChallengeOrchestrator",
    "GeneratedChallenge",
    "GenerationMode",
    "OrchestratorRun",
    "build_generation_request",
    "generate_challenge",
    "generate_challenge_fast",
    "generate_challenge_or_raise",
]
