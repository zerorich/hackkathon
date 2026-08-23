from __future__ import annotations

from server.agents.schemas import GeneratedChallenge, GeneratedQuestion
from server.agents.validation import validate_challenge, validate_question


class ChallengeCritic:
    def review_questions(
        self,
        questions: list[GeneratedQuestion],
    ) -> tuple[list[GeneratedQuestion], list[str]]:
        accepted: list[GeneratedQuestion] = []
        errors: list[str] = []

        for index, question in enumerate(questions, start=1):
            question_errors = validate_question(question)
            if question_errors:
                for err in question_errors:
                    errors.append(f"question {index}: {err}")
                continue
            accepted.append(question)

        return accepted, errors

    def review_challenge(
        self,
        challenge: GeneratedChallenge,
        *,
        expected_count: int | None = None,
    ) -> tuple[GeneratedChallenge | None, list[str]]:
        errors = validate_challenge(challenge, expected_count=expected_count)
        if errors:
            return None, errors
        return challenge, []
