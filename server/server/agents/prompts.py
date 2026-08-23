from __future__ import annotations

from server.agents.schemas import ChallengeGenerationRequest, QuestionType


def planner_system_prompt() -> str:
    return (
        "You are the Planner for Maktab AI Arena challenge generation. "
        "Given a school topic, produce a compact generation plan. "
        "Return ONLY valid JSON matching this shape:\n"
        '{"focus_areas":["..."],"question_mix":{"SINGLE_CHOICE":3,"TRUE_FALSE":2},'
        '"batch_size":2,"notes":"..."}'
    )


def planner_user_prompt(request: ChallengeGenerationRequest) -> str:
    return (
        f"Subject: {request.subject_name}\n"
        f"Topic: {request.topic_title}\n"
        f"Description: {request.topic_description or 'n/a'}\n"
        f"Context: {request.source_context or 'n/a'}\n"
        f"Difficulty: {request.difficulty.value}\n"
        f"Question count: {request.question_count}\n"
        f"Language: {request.language}\n"
        "Allocate question_mix counts that sum to question_count."
    )


def researcher_system_prompt() -> str:
    return (
        "You are the Researcher for Maktab AI Arena. "
        "Extract concise learning objectives and key concepts for quiz writing. "
        "Return ONLY valid JSON:\n"
        '{"learning_objectives":["..."],"key_concepts":["..."],'
        '"pitfalls":["..."],"vocabulary":["..."]}'
    )


def researcher_user_prompt(request: ChallengeGenerationRequest) -> str:
    return (
        f"Subject: {request.subject_name}\n"
        f"Topic: {request.topic_title}\n"
        f"Description: {request.topic_description or 'n/a'}\n"
        f"Context: {request.source_context or 'n/a'}\n"
        f"Difficulty: {request.difficulty.value}\n"
        f"Language: {request.language}\n"
        "Keep lists short and actionable for question writers."
    )


def writer_system_prompt() -> str:
    return (
        "You are a Question Writer for Maktab AI Arena. "
        "Create school-appropriate quiz questions. "
        "Supported types: SINGLE_CHOICE (2-4 options), TRUE_FALSE (exactly 2 options). "
        "Each question must have exactly one correct option. "
        "Avoid trick questions, unsafe content, and duplicate prompts. "
        "Return ONLY valid JSON:\n"
        '{"questions":[{"type":"SINGLE_CHOICE","prompt":"...","options":'
        '[{"text":"...","is_correct":false}],"explanation":"...","points":100}]}'
    )


def writer_user_prompt(
    request: ChallengeGenerationRequest,
    *,
    focus_areas: list[str],
    key_concepts: list[str],
    question_types: list[QuestionType],
    count: int,
    start_index: int,
) -> str:
    types = ", ".join(question_types)
    return (
        f"Subject: {request.subject_name}\n"
        f"Topic: {request.topic_title}\n"
        f"Difficulty: {request.difficulty.value}\n"
        f"Language: {request.language}\n"
        f"Focus: {', '.join(focus_areas)}\n"
        f"Concepts: {', '.join(key_concepts)}\n"
        f"Write {count} question(s), types allowed: {types}.\n"
        f"Number questions mentally starting at {start_index}.\n"
        "Use points=100 unless difficulty is HARD (150)."
    )


def fast_writer_user_prompt(request: ChallengeGenerationRequest) -> str:
    return (
        f"Subject: {request.subject_name}\n"
        f"Topic: {request.topic_title}\n"
        f"Description: {request.topic_description or 'n/a'}\n"
        f"Context: {request.source_context or 'n/a'}\n"
        f"Difficulty: {request.difficulty.value}\n"
        f"Language: {request.language}\n"
        f"Generate exactly {request.question_count} questions "
        f"mixing SINGLE_CHOICE and TRUE_FALSE.\n"
        'Return JSON: {"title":"...","questions":[...]}'
    )


def synthesizer_system_prompt() -> str:
    return (
        "You are the Synthesizer for Maktab AI Arena. "
        "Merge validated questions into one challenge. "
        "Improve title clarity, preserve question content unless fixing minor wording. "
        "Return ONLY valid JSON: "
        '{"title":"...","questions":[...]}'
    )


def synthesizer_user_prompt(
    request: ChallengeGenerationRequest,
    questions_json: str,
) -> str:
    return (
        f"Subject: {request.subject_name}\n"
        f"Topic: {request.topic_title}\n"
        f"Target count: {request.question_count}\n"
        f"Language: {request.language}\n"
        f"Validated questions JSON:\n{questions_json}"
    )


def default_question_mix(request: ChallengeGenerationRequest) -> dict[QuestionType, int]:
    total = request.question_count
    true_false = max(1, total // 5)
    single_choice = total - true_false
    return {
        QuestionType.SINGLE_CHOICE: single_choice,
        QuestionType.TRUE_FALSE: true_false,
    }


def default_focus_areas(request: ChallengeGenerationRequest) -> list[str]:
    return [request.topic_title, request.subject_name]


def default_key_concepts(request: ChallengeGenerationRequest) -> list[str]:
    if request.source_context:
        return [request.source_context[:120]]
    if request.topic_description:
        return [request.topic_description[:120]]
    return [request.topic_title]
