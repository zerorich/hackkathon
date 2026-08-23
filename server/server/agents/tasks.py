from __future__ import annotations

from uuid import uuid4

from server.agents.memory import AgentMemory, SharedContext
from server.agents.models import AgentRole, AgentTask, GenerationMode
from server.agents.merger import ChallengeMerger
from server.agents.prompts import default_question_mix
from server.agents.schemas import ChallengeGenerationRequest, GenerationPlan, QuestionType


class TaskGraphBuilder:
    def __init__(self) -> None:
        self._merger = ChallengeMerger()

    def build(
        self,
        request: ChallengeGenerationRequest,
        *,
        run_id: str,
        mode: GenerationMode,
        plan: GenerationPlan | None = None,
    ) -> tuple[list[AgentTask], AgentMemory]:
        memory = AgentMemory(
            run_id=run_id,
            shared=SharedContext(request=request, plan=plan),
        )
        tasks: list[AgentTask] = []

        if mode == GenerationMode.DEEP:
            planner = AgentTask(
                id=f"{run_id}-planner",
                run_id=run_id,
                role=AgentRole.PLANNER,
                name="plan-structure",
                input_payload={"question_count": request.question_count},
            )
            researcher = AgentTask(
                id=f"{run_id}-researcher",
                run_id=run_id,
                role=AgentRole.RESEARCHER,
                name="analyze-context",
                input_payload={},
            )
            tasks.extend([planner, researcher])

            effective_plan = plan or GenerationPlan(
                focus_areas=[request.topic_title],
                question_mix=default_question_mix(request),
                batch_size=2,
            )
            batches = self._merger.distribute_types(
                effective_plan.question_mix,
                effective_plan.batch_size,
            )
            for index, batch_types in enumerate(batches):
                writer = AgentTask(
                    id=f"{run_id}-writer-{index}",
                    run_id=run_id,
                    role=AgentRole.QUESTION_WRITER,
                    name=f"write-batch-{index + 1}",
                    depends_on=[planner.id, researcher.id],
                    input_payload={
                        "batch_index": index,
                        "question_types": [t.value for t in batch_types],
                        "count": len(batch_types),
                    },
                )
                tasks.append(writer)

            synthesizer = AgentTask(
                id=f"{run_id}-synthesizer",
                run_id=run_id,
                role=AgentRole.SYNTHESIZER,
                name="merge-challenge",
                depends_on=[task.id for task in tasks if task.role == AgentRole.QUESTION_WRITER],
            )
            tasks.append(synthesizer)
            return tasks, memory

        writer = AgentTask(
            id=f"{run_id}-fast-writer",
            run_id=run_id,
            role=AgentRole.QUESTION_WRITER,
            name="fast-generate-all",
            input_payload={"fast_path": True},
        )
        tasks.append(writer)
        return tasks, memory


def new_run_id() -> str:
    return str(uuid4())
