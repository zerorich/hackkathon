from __future__ import annotations

from server.agents.schemas import GeneratedChallenge, GeneratedQuestion, QuestionType


def validate_question(question: GeneratedQuestion) -> list[str]:
    errors: list[str] = []

    if not question.prompt.strip():
        errors.append("prompt must not be empty")

    if len(question.options) < 2:
        errors.append("question must have at least 2 options")

    correct = [option for option in question.options if option.is_correct]
    if len(correct) != 1:
        errors.append("question must have exactly one correct option")

    for option in question.options:
        if not option.text.strip():
            errors.append("option text must not be empty")

    if question.type == QuestionType.TRUE_FALSE and len(question.options) != 2:
        errors.append("TRUE_FALSE must have exactly 2 options")

    if question.type == QuestionType.SINGLE_CHOICE and len(question.options) < 2:
        errors.append("SINGLE_CHOICE must have at least 2 options")

    return errors


def validate_challenge(
    challenge: GeneratedChallenge,
    *,
    expected_count: int | None = None,
) -> list[str]:
    errors: list[str] = []

    if not challenge.title.strip():
        errors.append("title must not be empty")

    if expected_count is not None and len(challenge.questions) != expected_count:
        errors.append(f"expected {expected_count} questions, got {len(challenge.questions)}")

    prompts = set()
    for index, question in enumerate(challenge.questions, start=1):
        question_errors = validate_question(question)
        for err in question_errors:
            errors.append(f"question {index}: {err}")
        normalized_prompt = question.prompt.strip().lower()
        if normalized_prompt in prompts:
            errors.append(f"question {index}: duplicate prompt")
        prompts.add(normalized_prompt)

    return errors
