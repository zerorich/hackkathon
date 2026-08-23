from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field

from server.agents.models import AgentResult
from server.agents.schemas import ChallengeGenerationRequest, GenerationPlan, ResearchBrief


class SharedContext(BaseModel):
    request: ChallengeGenerationRequest
    plan: GenerationPlan | None = None
    research: ResearchBrief | None = None
    extras: dict[str, Any] = Field(default_factory=dict)


class AgentMemory(BaseModel):
    run_id: str
    shared: SharedContext
    task_results: dict[str, AgentResult] = Field(default_factory=dict)

    def put_result(self, result: AgentResult) -> None:
        self.task_results[result.task_id] = result

    def get_result(self, task_id: str) -> AgentResult | None:
        return self.task_results.get(task_id)

    def snapshot_for_role(self, role: str) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "request": self.shared.request.model_dump(mode="json"),
        }
        if self.shared.plan is not None:
            payload["plan"] = self.shared.plan.model_dump(mode="json")
        if self.shared.research is not None:
            payload["research"] = self.shared.research.model_dump(mode="json")
        payload["role"] = role
        return payload
