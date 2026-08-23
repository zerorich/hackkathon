from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime
from typing import Literal
from zoneinfo import ZoneInfo

from server.core.enums import MasteryCategory

MASTERY_ATTEMPTS_N = 5
LEVEL_XP_STEP = 500


def calculate_attempt_score(*, earned_points: int, total_points: int) -> int:
    if total_points <= 0:
        return 0
    return max(0, min(1000, round((earned_points / total_points) * 1000)))


def calculate_accuracy(*, correct_count: int, total_questions: int) -> float:
    if total_questions <= 0:
        return 0.0
    return round((correct_count / total_questions) * 100, 2)


def calculate_attempt_xp(*, accuracy_percent: float, duel_winner_bonus: int = 0) -> int:
    base_xp = 20
    accuracy_xp = round(accuracy_percent * 0.6)
    perfect_bonus = 20 if accuracy_percent >= 100.0 else 0
    xp = base_xp + accuracy_xp + perfect_bonus + duel_winner_bonus
    return min(100 + duel_winner_bonus, xp)


def calculate_duel_bonus() -> int:
    return 30


def calculate_level(total_xp: int) -> int:
    return (total_xp // LEVEL_XP_STEP) + 1


def level_progress(total_xp: int) -> tuple[int, int, int]:
    level = calculate_level(total_xp)
    current_level_xp = total_xp % LEVEL_XP_STEP
    next_level_xp = LEVEL_XP_STEP
    return level, current_level_xp, next_level_xp


def calculate_streak(
    *,
    current_streak: int,
    last_activity_date: date | None,
    activity_date: date,
) -> int:
    if last_activity_date is None:
        return 1
    if activity_date == last_activity_date:
        return current_streak
    if (activity_date - last_activity_date).days == 1:
        return current_streak + 1
    return 1


def to_local_date(dt: datetime, timezone_name: str) -> date:
    tz = ZoneInfo(timezone_name)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=ZoneInfo("UTC"))
    return dt.astimezone(tz).date()


def calculate_topic_mastery(accuracies: list[float]) -> tuple[float, MasteryCategory]:
    if not accuracies:
        return 0.0, MasteryCategory.WEAK
    recent = accuracies[-MASTERY_ATTEMPTS_N:]
    mastery = round(sum(recent) / len(recent), 2)
    if mastery < 40:
        category = MasteryCategory.WEAK
    elif mastery < 70:
        category = MasteryCategory.LEARNING
    elif mastery < 90:
        category = MasteryCategory.GOOD
    else:
        category = MasteryCategory.MASTERED
    return mastery, category


@dataclass(frozen=True)
class DuelParticipantResult:
    user_id: str
    score: int
    correct_count: int
    duration_seconds: int


def resolve_duel_winner(
    creator: DuelParticipantResult,
    opponent: DuelParticipantResult,
) -> str | Literal["DRAW"]:
    if creator.score != opponent.score:
        return creator.user_id if creator.score > opponent.score else opponent.user_id
    if creator.correct_count != opponent.correct_count:
        return (
            creator.user_id if creator.correct_count > opponent.correct_count else opponent.user_id
        )
    if creator.duration_seconds != opponent.duration_seconds:
        return (
            creator.user_id
            if creator.duration_seconds < opponent.duration_seconds
            else opponent.user_id
        )
    return "DRAW"


@dataclass(frozen=True)
class LeaderboardEntry:
    user_id: str
    display_name: str
    total_xp: int
    level: int
    streak: int
    rank: int


def calculate_leaderboard_rank_data(
    rows: list[tuple[str, str, int, int, int, int]],
) -> list[LeaderboardEntry]:
    sorted_rows = sorted(rows, key=lambda r: (-r[2], -r[5], r[0]))
    result: list[LeaderboardEntry] = []
    for idx, (user_id, display_name, total_xp, level, streak, _completed) in enumerate(
        sorted_rows, start=1
    ):
        result.append(
            LeaderboardEntry(
                user_id=user_id,
                display_name=display_name,
                total_xp=total_xp,
                level=level,
                streak=streak,
                rank=idx,
            )
        )
    return result


@dataclass(frozen=True)
class TopicAnalyticsRow:
    topic_id: str
    title: str
    attempts_count: int
    average_accuracy: float
    is_weak: bool


def calculate_class_analytics(
    topic_rows: list[tuple[str, str, list[float]]],
    *,
    weak_threshold: float = 60.0,
    min_attempts: int = 3,
) -> list[TopicAnalyticsRow]:
    result: list[TopicAnalyticsRow] = []
    for topic_id, title, accuracies in topic_rows:
        count = len(accuracies)
        avg = round(sum(accuracies) / count, 2) if count else 0.0
        is_weak = count >= min_attempts and avg < weak_threshold
        result.append(
            TopicAnalyticsRow(
                topic_id=topic_id,
                title=title,
                attempts_count=count,
                average_accuracy=avg,
                is_weak=is_weak,
            )
        )
    return result
