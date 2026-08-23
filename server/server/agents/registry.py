from __future__ import annotations

from server.agents.models import AgentRole

ROLE_REGISTRY: dict[AgentRole, str] = {
    AgentRole.PLANNER: (
        "Plans challenge structure: focus areas, question type mix, batching. Output JSON only."
    ),
    AgentRole.RESEARCHER: (
        "Extracts learning objectives and key concepts from topic context. Output JSON only."
    ),
    AgentRole.QUESTION_WRITER: (
        "Writes school quiz questions for SINGLE_CHOICE or TRUE_FALSE. "
        "Exactly one correct option per question. Output JSON only."
    ),
    AgentRole.CRITIC: ("Validates generated questions against schema and pedagogy rules."),
    AgentRole.SYNTHESIZER: (
        "Merges validated questions into a cohesive challenge with title. Output JSON only."
    ),
}


def get_role_description(role: AgentRole) -> str:
    return ROLE_REGISTRY[role]
