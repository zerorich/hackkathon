from __future__ import annotations

import pytest

from server.services.calculations import (
    calculate_accuracy,
    calculate_attempt_score,
    calculate_attempt_xp,
    calculate_duel_bonus,
    calculate_level,
    calculate_streak,
    calculate_topic_mastery,
    resolve_duel_winner,
    DuelParticipantResult,
)
from server.core.enums import MasteryCategory


def test_calculate_attempt_score():
    assert calculate_attempt_score(earned_points=5, total_points=10) == 500
    assert calculate_attempt_score(earned_points=10, total_points=10) == 1000


def test_calculate_attempt_xp_perfect():
    assert calculate_attempt_xp(accuracy_percent=100.0) == 100


def test_calculate_streak():
    from datetime import date

    assert calculate_streak(current_streak=3, last_activity_date=date(2026, 1, 1), activity_date=date(2026, 1, 1)) == 3
    assert calculate_streak(current_streak=3, last_activity_date=date(2026, 1, 1), activity_date=date(2026, 1, 2)) == 4
    assert calculate_streak(current_streak=5, last_activity_date=date(2026, 1, 1), activity_date=date(2026, 1, 3)) == 1


def test_resolve_duel_winner_by_score():
    creator = DuelParticipantResult("a", 900, 5, 60)
    opponent = DuelParticipantResult("b", 800, 5, 40)
    assert resolve_duel_winner(creator, opponent) == "a"


def test_calculate_topic_mastery():
    mastery, cat = calculate_topic_mastery([30, 40, 50])
    assert mastery == 40.0
    assert cat == MasteryCategory.LEARNING


def test_calculate_level():
    assert calculate_level(0) == 1
    assert calculate_level(500) == 2


def test_duel_bonus():
    assert calculate_duel_bonus() == 30
