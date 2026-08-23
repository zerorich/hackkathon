from __future__ import annotations

import json
import re
from typing import Any

from server.core.enums import QuestionType
from server.core.errors import ERROR_CODES, AppError


def _extract_json(text: str) -> dict[str, Any]:
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    return json.loads(text)


def validate_ai_challenge_output(
    payload: dict[str, Any],
    *,
    expected_count: int,
) -> dict[str, Any]:
    if "title" not in payload or "questions" not in payload:
        raise AppError(
            ERROR_CODES.AI_OUTPUT_INVALID,
            "AI output missing title or questions",
            status_code=422,
        )

    questions = payload["questions"]
    if not isinstance(questions, list):
        raise AppError(ERROR_CODES.AI_OUTPUT_INVALID, "Questions must be a list", status_code=422)

    if len(questions) != expected_count:
        raise AppError(
            ERROR_CODES.AI_OUTPUT_INVALID,
            f"Expected {expected_count} questions, got {len(questions)}",
            status_code=422,
        )

    validated_questions: list[dict[str, Any]] = []
    for q in questions:
        qtype = q.get("type", QuestionType.SINGLE_CHOICE)
        if qtype not in (QuestionType.SINGLE_CHOICE, QuestionType.TRUE_FALSE):
            raise AppError(ERROR_CODES.INVALID_QUESTION, f"Invalid question type: {qtype}")

        options = q.get("options", [])
        if not options or any(not opt.get("text", "").strip() for opt in options):
            raise AppError(ERROR_CODES.INVALID_QUESTION, "Empty option text")

        correct = [opt for opt in options if opt.get("is_correct")]
        if len(correct) != 1:
            raise AppError(
                ERROR_CODES.INVALID_CORRECT_OPTION_COUNT,
                "Each question must have exactly one correct option",
            )

        validated_questions.append(
            {
                "prompt": q["prompt"],
                "type": qtype,
                "explanation": q.get("explanation"),
                "points": int(q.get("points", 1)),
                "options": [
                    {"text": opt["text"], "is_correct": bool(opt.get("is_correct"))}
                    for opt in options
                ],
            }
        )

    return {"title": payload["title"], "questions": validated_questions}


def parse_ai_response(raw: str, *, expected_count: int) -> dict[str, Any]:
    try:
        payload = _extract_json(raw)
    except (json.JSONDecodeError, TypeError) as exc:
        raise AppError(
            ERROR_CODES.AI_OUTPUT_INVALID,
            "Failed to parse AI response as JSON",
            status_code=422,
        ) from exc
    return validate_ai_challenge_output(payload, expected_count=expected_count)
