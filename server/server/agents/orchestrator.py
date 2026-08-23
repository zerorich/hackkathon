from __future__ import annotations

import logging
from datetime import UTC, datetime

from server.agents.ai_adapter import AIClient, resolve_ai_client
from server.agents.critic import ChallengeCritic
from server.agents.errors import AgentGenerationError
from server.agents.executor import run_bounded_parallel
from server.agents.memory import AgentMemory
from server.agents.merger import ChallengeMerger
from server.agents.models import (
    AgentResult,
    AgentRole,
    AgentTask,
    AgentTaskStatus,
    ChallengeGenerationResult,
    GenerationMode,
    OrchestratorRun,
    OrchestratorStatus,
)
from server.agents.roles import (
    PlannerAgent,
    QuestionWriterAgent,
    ResearcherAgent,
    SynthesizerAgent,
)
from server.agents.schemas import (
    ChallengeGenerationRequest,
    GeneratedChallenge,
    GeneratedQuestion,
    SynthesizerOutput,
    WriterBatchOutput,
)
from server.agents.tasks import TaskGraphBuilder, new_run_id

logger = logging.getLogger(__name__)

AI_OUTPUT_INVALID = "AI_OUTPUT_INVALID"
AI_PROVIDER_UNAVAILABLE = "AI_PROVIDER_UNAVAILABLE"
INTERNAL_ERROR = "INTERNAL_ERROR"

DEFAULT_MAX_CONCURRENCY = 3


class ChallengeOrchestrator:
    """Supervisor for Maktab AI Arena multi-agent challenge generation."""

    def __init__(
        self,
        *,
        max_concurrency: int = DEFAULT_MAX_CONCURRENCY,
        cancel_on_failure: bool = True,
    ) -> None:
        self._max_concurrency = max_concurrency
        self._cancel_on_failure = cancel_on_failure
        self._graph_builder = TaskGraphBuilder()
        self._planner = PlannerAgent()
        self._researcher = ResearcherAgent()
        self._writer = QuestionWriterAgent()
        self._synthesizer = SynthesizerAgent()
        self._critic = ChallengeCritic()
        self._merger = ChallengeMerger()

    async def run(
        self,
        request: ChallengeGenerationRequest,
        *,
        mode: GenerationMode = GenerationMode.DEEP,
        ai_client: AIClient | None = None,
    ) -> ChallengeGenerationResult:
        run_id = request.run_id or new_run_id()
        request = request.model_copy(update={"run_id": run_id})
        client = await resolve_ai_client(ai_client)

        orchestrator_run = OrchestratorRun(
            id=run_id,
            status=OrchestratorStatus.RUNNING,
            mode=mode,
            request=request,
            started_at=datetime.now(tz=UTC),
        )

        tasks, memory = self._graph_builder.build(request, run_id=run_id, mode=mode)
        orchestrator_run.tasks = tasks

        try:
            if mode == GenerationMode.FAST:
                challenge, run_results, validation_errors = await self._run_fast_path(
                    tasks[0],
                    memory,
                    client,
                )
            else:
                challenge, run_results, validation_errors = await self._run_deep_path(
                    tasks,
                    memory,
                    client,
                )

            orchestrator_run.results = run_results
            orchestrator_run.plan = memory.shared.plan
            orchestrator_run.research = memory.shared.research
            orchestrator_run.validation_errors = validation_errors

            if challenge is None:
                orchestrator_run.status = OrchestratorStatus.FAILED
                orchestrator_run.error_code = AI_OUTPUT_INVALID
                orchestrator_run.error_message = "; ".join(validation_errors) or "generation failed"
                orchestrator_run.finished_at = datetime.now(tz=UTC)
                return ChallengeGenerationResult(
                    run=orchestrator_run,
                    challenge=None,
                    success=False,
                )

            orchestrator_run.challenge = challenge
            orchestrator_run.status = OrchestratorStatus.COMPLETED
            orchestrator_run.finished_at = datetime.now(tz=UTC)
            return ChallengeGenerationResult(
                run=orchestrator_run,
                challenge=challenge,
                success=True,
            )
        except AgentGenerationError:
            raise
        except Exception as exc:
            logger.exception("orchestrator_failed run_id=%s error=%s", run_id, exc)
            orchestrator_run.status = OrchestratorStatus.FAILED
            orchestrator_run.error_code = AI_PROVIDER_UNAVAILABLE
            orchestrator_run.error_message = str(exc)
            orchestrator_run.finished_at = datetime.now(tz=UTC)
            return ChallengeGenerationResult(
                run=orchestrator_run,
                challenge=None,
                success=False,
            )

    async def _run_fast_path(
        self,
        task: AgentTask,
        memory: AgentMemory,
        client: AIClient,
    ) -> tuple[GeneratedChallenge | None, list[AgentResult], list[str]]:
        task.status = AgentTaskStatus.RUNNING
        result = await self._writer.run(task, memory, client)
        task.status = AgentTaskStatus.COMPLETED if result.success else AgentTaskStatus.FAILED
        memory.put_result(result)

        if not result.success or not result.output:
            return None, [result], [result.error or "fast writer failed"]

        payload = SynthesizerOutput.model_validate(result.output)
        challenge = GeneratedChallenge(title=payload.title, questions=payload.questions)
        reviewed, errors = self._critic.review_challenge(
            challenge,
            expected_count=memory.shared.request.question_count,
        )
        return reviewed, [result], errors

    async def _run_deep_path(
        self,
        tasks: list[AgentTask],
        memory: AgentMemory,
        client: AIClient,
    ) -> tuple[GeneratedChallenge | None, list[AgentResult], list[str]]:
        results: list[AgentResult] = []

        prep_tasks = [task for task in tasks if task.role in {AgentRole.PLANNER, AgentRole.RESEARCHER}]
        prep_jobs = [
            (
                task.id,
                task.role,
                (lambda t=task: self._dispatch(task=t, memory=memory, client=client)),
            )
            for task in prep_tasks
        ]
        prep_results = await run_bounded_parallel(
            prep_jobs,
            max_concurrency=2,
            cancel_remaining_on_failure=self._cancel_on_failure,
        )
        for prep_result in prep_results:
            results.append(prep_result)
            memory.put_result(prep_result)
            self._mark_task_status(tasks, prep_result)

        writer_tasks = [task for task in tasks if task.role == AgentRole.QUESTION_WRITER]
        writer_jobs = [
            (
                task.id,
                task.role,
                (lambda t=task: self._dispatch(task=t, memory=memory, client=client)),
            )
            for task in writer_tasks
        ]
        writer_results = await run_bounded_parallel(
            writer_jobs,
            max_concurrency=self._max_concurrency,
            cancel_remaining_on_failure=self._cancel_on_failure,
        )

        collected_questions: list[GeneratedQuestion] = []
        writer_errors: list[str] = []
        for writer_result in writer_results:
            results.append(writer_result)
            memory.put_result(writer_result)
            self._mark_task_status(tasks, writer_result)
            if not writer_result.success or not writer_result.output:
                writer_errors.append(writer_result.error or "writer batch failed")
                continue
            batch = WriterBatchOutput.model_validate(writer_result.output)
            accepted, batch_errors = self._critic.review_questions(batch.questions)
            collected_questions.extend(accepted)
            writer_errors.extend(batch_errors)

        if not collected_questions:
            return None, results, writer_errors or ["no valid questions produced"]

        synthesizer_task = next(task for task in tasks if task.role == AgentRole.SYNTHESIZER)
        synthesizer_task.status = AgentTaskStatus.RUNNING
        synth_result = await self._synthesizer.run(
            synthesizer_task,
            memory,
            client,
            questions_payload=[question.model_dump(mode="json") for question in collected_questions],
        )
        synthesizer_task.status = (
            AgentTaskStatus.COMPLETED if synth_result.success else AgentTaskStatus.FAILED
        )
        results.append(synth_result)
        memory.put_result(synth_result)

        if synth_result.success and synth_result.output:
            payload = SynthesizerOutput.model_validate(synth_result.output)
            challenge = GeneratedChallenge(title=payload.title, questions=payload.questions)
        else:
            challenge = self._merger.merge_questions(
                memory.shared.request,
                collected_questions,
            )

        reviewed, review_errors = self._critic.review_challenge(
            challenge,
            expected_count=memory.shared.request.question_count,
        )
        all_errors = writer_errors + review_errors
        if reviewed is None and collected_questions:
            trimmed = self._merger.merge_questions(
                memory.shared.request,
                collected_questions,
            )
            reviewed, retry_errors = self._critic.review_challenge(trimmed)
            all_errors.extend(retry_errors)
        return reviewed, results, all_errors

    async def _dispatch(
        self,
        *,
        task: AgentTask,
        memory: AgentMemory,
        client: AIClient,
    ) -> AgentResult:
        task.status = AgentTaskStatus.RUNNING
        if task.role == AgentRole.PLANNER:
            result = await self._planner.run(task, memory, client)
        elif task.role == AgentRole.RESEARCHER:
            result = await self._researcher.run(task, memory, client)
        elif task.role == AgentRole.QUESTION_WRITER:
            result = await self._writer.run(task, memory, client)
        else:
            raise AgentGenerationError(
                INTERNAL_ERROR,
                f"Unsupported dispatch role: {task.role}",
            )
        task.status = AgentTaskStatus.COMPLETED if result.success else AgentTaskStatus.FAILED
        return result

    @staticmethod
    def _mark_task_status(tasks: list[AgentTask], result: AgentResult) -> None:
        for task in tasks:
            if task.id == result.task_id:
                task.status = (
                    AgentTaskStatus.COMPLETED if result.success else AgentTaskStatus.FAILED
                )
                break
