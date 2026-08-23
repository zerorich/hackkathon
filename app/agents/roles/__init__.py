from __future__ import annotations

import time

from app.agents.ai_adapter import AIClient
from app.agents.json_utils import parse_model_json
from app.agents.memory import AgentMemory
from app.agents.models import AgentResult, AgentRole, AgentTask
from app.agents.prompts import (
    default_focus_areas,
    default_key_concepts,
    default_question_mix,
    fast_writer_user_prompt,
    planner_system_prompt,
    planner_user_prompt,
    researcher_system_prompt,
    researcher_user_prompt,
    synthesizer_system_prompt,
    synthesizer_user_prompt,
    writer_system_prompt,
    writer_user_prompt,
)
from app.agents.schemas import (
    GenerationPlan,
    QuestionType,
    ResearchBrief,
    SynthesizerOutput,
    WriterBatchOutput,
)


class PlannerAgent:
    role = AgentRole.PLANNER

    async def run(
        self,
        task: AgentTask,
        memory: AgentMemory,
        client: AIClient,
    ) -> AgentResult:
        started = time.perf_counter()
        request = memory.shared.request
        try:
            raw = await client.complete(
                system=planner_system_prompt(),
                user=planner_user_prompt(request),
                temperature=0.1,
                max_tokens=1024,
            )
            plan = parse_model_json(raw, GenerationPlan)
            total = sum(plan.question_mix.values())
            if total != request.question_count:
                adjusted = default_question_mix(request)
                plan = plan.model_copy(update={"question_mix": adjusted})
            memory.shared.plan = plan
            return AgentResult(
                task_id=task.id,
                run_id=task.run_id,
                role=self.role,
                success=True,
                output=plan.model_dump(mode="json"),
                latency_ms=int((time.perf_counter() - started) * 1000),
            )
        except Exception as exc:
            fallback = GenerationPlan(
                focus_areas=default_focus_areas(request),
                question_mix=default_question_mix(request),
                batch_size=2,
                notes="fallback plan",
            )
            memory.shared.plan = fallback
            return AgentResult(
                task_id=task.id,
                run_id=task.run_id,
                role=self.role,
                success=True,
                output=fallback.model_dump(mode="json"),
                error=str(exc),
                latency_ms=int((time.perf_counter() - started) * 1000),
            )


class ResearcherAgent:
    role = AgentRole.RESEARCHER

    async def run(
        self,
        task: AgentTask,
        memory: AgentMemory,
        client: AIClient,
    ) -> AgentResult:
        started = time.perf_counter()
        request = memory.shared.request
        try:
            raw = await client.complete(
                system=researcher_system_prompt(),
                user=researcher_user_prompt(request),
                temperature=0.1,
                max_tokens=1024,
            )
            research = parse_model_json(raw, ResearchBrief)
            memory.shared.research = research
            return AgentResult(
                task_id=task.id,
                run_id=task.run_id,
                role=self.role,
                success=True,
                output=research.model_dump(mode="json"),
                latency_ms=int((time.perf_counter() - started) * 1000),
            )
        except Exception as exc:
            fallback = ResearchBrief(
                learning_objectives=[request.topic_title],
                key_concepts=default_key_concepts(request),
            )
            memory.shared.research = fallback
            return AgentResult(
                task_id=task.id,
                run_id=task.run_id,
                role=self.role,
                success=True,
                output=fallback.model_dump(mode="json"),
                error=str(exc),
                latency_ms=int((time.perf_counter() - started) * 1000),
            )


class QuestionWriterAgent:
    role = AgentRole.QUESTION_WRITER

    async def run(
        self,
        task: AgentTask,
        memory: AgentMemory,
        client: AIClient,
    ) -> AgentResult:
        started = time.perf_counter()
        request = memory.shared.request
        try:
            if task.input_payload.get("fast_path"):
                raw = await client.complete(
                    system=writer_system_prompt(),
                    user=fast_writer_user_prompt(request),
                    temperature=0.3,
                    max_tokens=4096,
                )
                payload = parse_model_json(raw, SynthesizerOutput)
                return AgentResult(
                    task_id=task.id,
                    run_id=task.run_id,
                    role=self.role,
                    success=True,
                    output=payload.model_dump(mode="json"),
                    latency_ms=int((time.perf_counter() - started) * 1000),
                )

            plan = memory.shared.plan
            research = memory.shared.research
            focus = plan.focus_areas if plan else default_focus_areas(request)
            concepts = research.key_concepts if research else default_key_concepts(request)
            types = [
                QuestionType(value)
                for value in task.input_payload.get("question_types", [])
            ] or list(QuestionType)
            count = int(task.input_payload.get("count", 1))
            batch_index = int(task.input_payload.get("batch_index", 0))
            start_index = batch_index * count + 1

            raw = await client.complete(
                system=writer_system_prompt(),
                user=writer_user_prompt(
                    request,
                    focus_areas=focus,
                    key_concepts=concepts,
                    question_types=types,
                    count=count,
                    start_index=start_index,
                ),
                temperature=0.35,
                max_tokens=2048,
            )
            batch = parse_model_json(raw, WriterBatchOutput)
            return AgentResult(
                task_id=task.id,
                run_id=task.run_id,
                role=self.role,
                success=True,
                output=batch.model_dump(mode="json"),
                latency_ms=int((time.perf_counter() - started) * 1000),
            )
        except Exception as exc:
            return AgentResult(
                task_id=task.id,
                run_id=task.run_id,
                role=self.role,
                success=False,
                error=str(exc),
                latency_ms=int((time.perf_counter() - started) * 1000),
            )


class SynthesizerAgent:
    role = AgentRole.SYNTHESIZER

    async def run(
        self,
        task: AgentTask,
        memory: AgentMemory,
        client: AIClient,
        *,
        questions_payload: list[dict],
    ) -> AgentResult:
        started = time.perf_counter()
        request = memory.shared.request
        try:
            raw = await client.complete(
                system=synthesizer_system_prompt(),
                user=synthesizer_user_prompt(
                    request,
                    questions_json=str(questions_payload),
                ),
                temperature=0.2,
                max_tokens=4096,
            )
            payload = parse_model_json(raw, SynthesizerOutput)
            return AgentResult(
                task_id=task.id,
                run_id=task.run_id,
                role=self.role,
                success=True,
                output=payload.model_dump(mode="json"),
                latency_ms=int((time.perf_counter() - started) * 1000),
            )
        except Exception as exc:
            return AgentResult(
                task_id=task.id,
                run_id=task.run_id,
                role=self.role,
                success=False,
                error=str(exc),
                latency_ms=int((time.perf_counter() - started) * 1000),
            )
