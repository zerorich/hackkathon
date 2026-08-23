from __future__ import annotations

from server.agents.schemas import (
    ChallengeGenerationRequest,
    GeneratedChallenge,
    GeneratedQuestion,
    QuestionType,
)


class ChallengeMerger:
    def merge_questions(
        self,
        request: ChallengeGenerationRequest,
        questions: list[GeneratedQuestion],
        *,
        title: str | None = None,
    ) -> GeneratedChallenge:
        ordered = sorted(
            questions,
            key=lambda q: (q.type.value, q.prompt),
        )
        final_title = title or self._default_title(request)
        return GeneratedChallenge(title=final_title, questions=ordered[: request.question_count])

    def trim_or_pad(
        self,
        challenge: GeneratedChallenge,
        *,
        expected_count: int,
    ) -> GeneratedChallenge:
        questions = challenge.questions[:expected_count]
        if len(questions) < expected_count:
            return GeneratedChallenge(title=challenge.title, questions=questions)
        return GeneratedChallenge(title=challenge.title, questions=questions)

    @staticmethod
    def _default_title(request: ChallengeGenerationRequest) -> str:
        return f"{request.topic_title} — {request.difficulty.value.title()} Practice"

    @staticmethod
    def distribute_types(
        question_mix: dict[QuestionType, int],
        batch_count: int,
    ) -> list[list[QuestionType]]:
        expanded: list[QuestionType] = []
        for question_type, count in question_mix.items():
            expanded.extend([question_type] * count)
        batches: list[list[QuestionType]] = []
        for index in range(0, len(expanded), batch_count):
            batches.append(expanded[index : index + batch_count])
        return batches
