from __future__ import annotations

from app.api.schemas import (
    ChallengeDetailOut,
    ChallengeOut,
    OptionOut,
    OptionWithCorrectOut,
    QuestionOut,
    QuestionResultOut,
)
from app.core.enums import DuelStatus
from app.models.entities import Attempt, AttemptAnswer, Challenge, Duel, Question
from app.services.calculations import level_progress

_DUEL_STATUS_API: dict[str, str] = {
    DuelStatus.PENDING: "WAITING",
    DuelStatus.ACCEPTED: "ACTIVE",
    DuelStatus.COMPLETED: "COMPLETED",
    DuelStatus.EXPIRED: "EXPIRED",
    DuelStatus.CANCELLED: "CANCELLED",
}


def duel_status_to_api(status: str) -> str:
    return _DUEL_STATUS_API.get(status, status)


def duel_result_type(duel: Duel) -> str | None:
    if duel.result_type:
        return duel.result_type
    if duel.status != DuelStatus.COMPLETED:
        return None
    if duel.winner_id is None:
        return "DRAW"
    if duel.winner_id == duel.creator_id:
        return "CHALLENGER_WIN"
    return "OPPONENT_WIN"


def challenge_to_out(challenge: Challenge) -> dict:
    return ChallengeOut.model_validate(challenge).model_dump()


def challenge_detail_to_out(challenge: Challenge, *, include_correct: bool = False) -> dict:
    questions: list[dict] = []
    for q in challenge.questions:
        if include_correct:
            questions.append(
                QuestionResultOut(
                    id=q.id,
                    order=q.order,
                    type=q.type,
                    prompt=q.prompt,
                    points=q.points,
                    explanation=q.explanation,
                    options=[
                        OptionWithCorrectOut(
                            id=o.id, order=o.order, text=o.text, is_correct=o.is_correct
                        )
                        for o in q.options
                    ],
                ).model_dump()
            )
        else:
            questions.append(
                QuestionOut(
                    id=q.id,
                    order=q.order,
                    type=q.type,
                    prompt=q.prompt,
                    points=q.points,
                    options=[OptionOut(id=o.id, order=o.order, text=o.text) for o in q.options],
                ).model_dump()
            )
    base = challenge_to_out(challenge)
    base["questions"] = questions
    return base


def attempt_to_out(attempt: Attempt) -> dict:
    total = attempt.total_questions or 0
    correct = attempt.correct_count or 0
    return {
        "id": attempt.id,
        "challenge_id": attempt.challenge_id,
        "status": attempt.status,
        "score": attempt.score,
        "correct_count": attempt.correct_count,
        "incorrect_count": max(0, total - correct),
        "total_questions": attempt.total_questions,
        "accuracy_percent": attempt.accuracy_percent,
        "xp_awarded": attempt.xp_awarded,
        "duration_seconds": attempt.duration_seconds,
        "started_at": attempt.started_at,
        "completed_at": attempt.completed_at,
    }


def attempt_finish_stats_out(*, total_xp: int, level: int, streak: int) -> dict:
    _, current_level_xp, next_level_xp = level_progress(total_xp)
    return {
        "total_xp": total_xp,
        "level": level,
        "streak": streak,
        "level_progress": {
            "current_level_xp": current_level_xp,
            "next_level_xp": next_level_xp,
            "xp_to_next_level": next_level_xp - current_level_xp,
        },
    }


def attempt_result_to_out(
    attempt: Attempt,
    *,
    questions: list[Question],
    answers: list[AttemptAnswer],
) -> dict:
    answer_map = {a.question_id: a for a in answers}
    q_out: list[dict] = []
    for q in questions:
        ans = answer_map.get(q.id)
        correct_option_id = next((o.id for o in q.options if o.is_correct), None)
        q_out.append(
            {
                **QuestionResultOut(
                    id=q.id,
                    order=q.order,
                    type=q.type,
                    prompt=q.prompt,
                    points=q.points,
                    explanation=q.explanation,
                    selected_option_id=ans.selected_option_id if ans else None,
                    is_correct=ans.is_correct if ans else None,
                    options=[
                        OptionWithCorrectOut(
                            id=o.id, order=o.order, text=o.text, is_correct=o.is_correct
                        )
                        for o in q.options
                    ],
                ).model_dump(),
                "correct_option_id": correct_option_id,
            }
        )
    result = attempt_to_out(attempt)
    result["questions"] = q_out
    return result
