from __future__ import annotations

import json
from datetime import timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from server.ai.fixtures import get_fixture
from server.ai.validator import validate_ai_challenge_output
from server.core.enums import (
    ActivityEventType,
    AttemptStatus,
    ChallengeOrigin,
    ChallengeStatus,
    ChallengeType,
    DuelStatus,
    MembershipRole,
    UserRole,
    XpSourceType,
)
from server.core.settings import get_settings
from server.core.security import hash_password
from server.db.session import get_session_factory
from server.models.entities import (
    ActivityEvent,
    Attempt,
    AttemptAnswer,
    Challenge,
    ClassMembership,
    Duel,
    Question,
    QuestionOption,
    SchoolClass,
    StudentStats,
    Subject,
    Topic,
    TopicProgress,
    User,
    XpLedger,
    duel_expires_at,
    utcnow,
)
from server.services.calculations import (
    calculate_accuracy,
    calculate_attempt_score,
    calculate_attempt_xp,
    calculate_duel_bonus,
    calculate_level,
    calculate_streak,
    calculate_topic_mastery,
    to_local_date,
)

DEMO_PASSWORD = "123456"


async def run_seed(session: AsyncSession | None = None) -> dict:
    owns_session = session is None
    if owns_session:
        session = get_session_factory()()

    try:
        admin = await _get_or_create_user(session, "admin@demo.local", "Demo Admin", UserRole.ADMIN)
        teacher = await _get_or_create_user(
            session, "teacher@demo.local", "Demo Teacher", UserRole.TEACHER
        )
        students = []
        for i in range(1, 6):
            students.append(
                await _get_or_create_user(
                    session,
                    f"student{i}@demo.local",
                    f"Student {i}",
                    UserRole.STUDENT,
                )
            )

        school_class = await _get_or_create_class(session, teacher)
        await _ensure_membership(session, school_class.id, admin.id, MembershipRole.TEACHER)
        for student in students:
            await _ensure_membership(session, school_class.id, student.id, MembershipRole.STUDENT)

        math = await _get_or_create_subject(
            session,
            school_class.id,
            teacher.id,
            "Mathematics",
            aliases=("Math",),
        )
        english = await _get_or_create_subject(session, school_class.id, teacher.id, "English")
        physics = await _get_or_create_subject(session, school_class.id, teacher.id, "Physics")

        topics = {
            "fractions": await _get_or_create_topic(session, math.id, teacher.id, "Fractions"),
            "quadratic": await _get_or_create_topic(
                session, math.id, teacher.id, "Quadratic Equations"
            ),
            "linear": await _get_or_create_topic(session, math.id, teacher.id, "Linear Functions"),
            "present_perfect": await _get_or_create_topic(
                session, english.id, teacher.id, "Present Perfect"
            ),
            "conditionals": await _get_or_create_topic(
                session, english.id, teacher.id, "Conditionals"
            ),
            "newton": await _get_or_create_topic(session, physics.id, teacher.id, "Newton's Laws"),
            "energy": await _get_or_create_topic(session, physics.id, teacher.id, "Energy"),
        }

        ready_challenge = await _get_or_create_ready_challenge(
            session,
            topics["fractions"],
            teacher.id,
            subject_name="Mathematics",
            topic_name="Fractions",
        )

        if not await _seed_has_attempts(session, school_class.id):
            await _seed_demo_progress(
                session,
                school_class=school_class,
                students=students,
                topics=topics,
                ready_challenge=ready_challenge,
            )

        if owns_session:
            await session.commit()
        return {
            "admin": admin.identifier,
            "teacher": teacher.identifier,
            "students": [s.identifier for s in students],
            "class_invite": school_class.invite_code,
            "ready_challenge_id": ready_challenge.id,
        }
    finally:
        if owns_session:
            await session.close()


async def _seed_has_attempts(session: AsyncSession, class_id: str) -> bool:
    result = await session.execute(select(Attempt.id).where(Attempt.class_id == class_id).limit(1))
    return result.scalar_one_or_none() is not None


async def _seed_demo_progress(
    session: AsyncSession,
    *,
    school_class: SchoolClass,
    students: list[User],
    topics: dict[str, Topic],
    ready_challenge: Challenge,
) -> None:
    settings = get_settings()
    class_id = school_class.id
    now = utcnow()
    activity_date = to_local_date(now, settings.app_timezone)

    topic_challenges: dict[str, Challenge] = {"fractions": ready_challenge}
    for key, topic in topics.items():
        if key == "fractions":
            continue
        subject_name = _subject_for_topic_key(key)
        topic_challenges[key] = await _create_ready_challenge_from_fixture(
            session,
            topic=topic,
            teacher_id=topic.created_by_id,
            subject_name=subject_name,
            topic_name=topic.title,
        )

    xp_balances: dict[str, int] = {s.id: 0 for s in students}
    stats_map: dict[str, StudentStats] = {}

    attempt_specs: list[tuple[int, str, float]] = [
        (0, "fractions", 1.0),
        (0, "quadratic", 0.8),
        (0, "linear", 0.6),
        (1, "fractions", 0.6),
        (1, "present_perfect", 0.4),
        (1, "conditionals", 0.2),
        (2, "quadratic", 0.8),
        (2, "newton", 0.6),
        (2, "energy", 1.0),
        (3, "conditionals", 0.4),
        (3, "conditionals", 0.2),
        (3, "present_perfect", 0.6),
        (4, "linear", 0.4),
        (4, "quadratic", 0.2),
        (4, "energy", 0.6),
    ]

    topic_accuracies: dict[tuple[str, str], list[float]] = {}

    for spec_idx, (student_idx, topic_key, accuracy_ratio) in enumerate(attempt_specs):
        student = students[student_idx]
        challenge = topic_challenges[topic_key]
        topic = topics[topic_key]
        attempt = await _create_completed_attempt(
            session,
            challenge=challenge,
            user=student,
            class_id=class_id,
            accuracy_ratio=accuracy_ratio,
            completed_at=now - timedelta(days=student_idx, hours=spec_idx % 5),
        )
        xp = attempt.xp_awarded or 0
        xp_balances[student.id] += xp
        await _add_xp_ledger(
            session,
            user_id=student.id,
            class_id=class_id,
            source_type=XpSourceType.ATTEMPT,
            source_id=attempt.id,
            amount=xp,
            balance_after=xp_balances[student.id],
            created_at=attempt.completed_at or now,
        )
        topic_accuracies.setdefault((student.id, topic.id), []).append(
            attempt.accuracy_percent or 0.0
        )
        session.add(
            ActivityEvent(
                class_id=class_id,
                user_id=student.id,
                event_type=ActivityEventType.ATTEMPT_COMPLETED,
                entity_type="attempt",
                entity_id=attempt.id,
                payload=json.dumps({"attemptId": attempt.id, "score": attempt.score}),
                created_at=attempt.completed_at or now,
            )
        )

        stats = stats_map.get(student.id)
        if stats is None:
            stats = StudentStats(
                user_id=student.id,
                class_id=class_id,
                total_xp=xp,
                level=calculate_level(xp),
                streak=1,
                last_activity_date=activity_date,
                attempts_completed=1,
                total_correct_answers=attempt.correct_count or 0,
                total_answers=attempt.total_questions or 0,
                average_accuracy=attempt.accuracy_percent or 0.0,
                last_attempt_at=attempt.completed_at,
                best_streak=1,
            )
            session.add(stats)
            stats_map[student.id] = stats
        else:
            stats.total_xp += xp
            stats.level = calculate_level(stats.total_xp)
            stats.streak = calculate_streak(
                current_streak=stats.streak,
                last_activity_date=stats.last_activity_date,
                activity_date=activity_date,
            )
            stats.last_activity_date = activity_date
            stats.attempts_completed += 1
            stats.total_correct_answers += attempt.correct_count or 0
            stats.total_answers += attempt.total_questions or 0
            stats.average_accuracy = (
                stats.total_correct_answers / stats.total_answers * 100
                if stats.total_answers
                else 0.0
            )
            stats.last_attempt_at = max(
                filter(None, (stats.last_attempt_at, attempt.completed_at)), default=None
            )
            stats.best_streak = max(stats.best_streak, stats.streak)

    for (user_id, topic_id), accuracies in topic_accuracies.items():
        mastery, category = calculate_topic_mastery(accuracies)
        session.add(
            TopicProgress(
                user_id=user_id,
                topic_id=topic_id,
                mastery_percent=mastery,
                mastery_category=category,
                attempts_count=len(accuracies),
            )
        )

    creator = students[0]
    opponent = students[1]
    duel_challenge = topic_challenges["fractions"]
    creator_attempt = await _create_completed_attempt(
        session,
        challenge=duel_challenge,
        user=creator,
        class_id=class_id,
        accuracy_ratio=1.0,
        completed_at=now - timedelta(hours=2),
    )
    opponent_attempt = await _create_completed_attempt(
        session,
        challenge=duel_challenge,
        user=opponent,
        class_id=class_id,
        accuracy_ratio=0.6,
        completed_at=now - timedelta(hours=1),
    )
    creator_attempt.duel_id = None
    opponent_attempt.duel_id = None

    duel = Duel(
        class_id=class_id,
        challenge_id=duel_challenge.id,
        creator_id=creator.id,
        creator_attempt_id=creator_attempt.id,
        opponent_id=opponent.id,
        opponent_attempt_id=opponent_attempt.id,
        status=DuelStatus.COMPLETED,
        winner_id=creator.id,
        expires_at=duel_expires_at(),
        completed_at=now - timedelta(minutes=30),
    )
    session.add(duel)
    await session.flush()
    creator_attempt.duel_id = duel.id
    opponent_attempt.duel_id = duel.id

    for duel_attempt in (creator_attempt, opponent_attempt):
        xp = duel_attempt.xp_awarded or 0
        xp_balances[duel_attempt.user_id] += xp
        await _add_xp_ledger(
            session,
            user_id=duel_attempt.user_id,
            class_id=class_id,
            source_type=XpSourceType.ATTEMPT,
            source_id=duel_attempt.id,
            amount=xp,
            balance_after=xp_balances[duel_attempt.user_id],
            created_at=duel_attempt.completed_at or now,
        )
        duel_stats = stats_map.get(duel_attempt.user_id)
        if duel_stats is not None:
            duel_stats.total_xp += xp
            duel_stats.level = calculate_level(duel_stats.total_xp)
            duel_stats.attempts_completed += 1
            duel_stats.total_correct_answers += duel_attempt.correct_count or 0
            duel_stats.total_answers += duel_attempt.total_questions or 0
            duel_stats.average_accuracy = (
                duel_stats.total_correct_answers / duel_stats.total_answers * 100
                if duel_stats.total_answers
                else 0.0
            )
            duel_stats.last_attempt_at = max(
                filter(None, (duel_stats.last_attempt_at, duel_attempt.completed_at)),
                default=None,
            )

    bonus = calculate_duel_bonus()
    xp_balances[creator.id] += bonus
    await _add_xp_ledger(
        session,
        user_id=creator.id,
        class_id=class_id,
        source_type=XpSourceType.DUEL_WIN,
        source_id=duel.id,
        amount=bonus,
        balance_after=xp_balances[creator.id],
        created_at=duel.completed_at or now,
    )
    creator_stats = stats_map[creator.id]
    creator_stats.total_xp += bonus
    creator_stats.level = calculate_level(creator_stats.total_xp)
    creator_stats.duels_won += 1
    stats_map[opponent.id].duels_lost += 1

    session.add(
        ActivityEvent(
            class_id=class_id,
            user_id=creator.id,
            event_type=ActivityEventType.DUEL_COMPLETED,
            entity_type="duel",
            entity_id=duel.id,
            payload=json.dumps({"duelId": duel.id, "winnerId": creator.id}),
            created_at=duel.completed_at or now,
        )
    )
    session.add(
        ActivityEvent(
            class_id=class_id,
            user_id=teacher_id_from_topic(topics["fractions"]),
            event_type=ActivityEventType.CHALLENGE_CREATED,
            entity_type="challenge",
            entity_id=ready_challenge.id,
            payload=json.dumps({"challengeId": ready_challenge.id}),
            created_at=now - timedelta(days=2),
        )
    )
    session.add(
        ActivityEvent(
            class_id=class_id,
            user_id=students[2].id,
            event_type=ActivityEventType.MEMBER_JOINED,
            entity_type="user",
            entity_id=students[2].id,
            payload=json.dumps({"userId": students[2].id}),
            created_at=now - timedelta(days=5),
        )
    )
    await session.flush()


def _subject_for_topic_key(key: str) -> str:
    if key in {"fractions", "quadratic", "linear"}:
        return "Mathematics"
    if key in {"present_perfect", "conditionals"}:
        return "English"
    return "Physics"


def teacher_id_from_topic(topic: Topic) -> str:
    return topic.created_by_id


async def _add_xp_ledger(
    session: AsyncSession,
    *,
    user_id: str,
    class_id: str,
    source_type: XpSourceType,
    source_id: str,
    amount: int,
    balance_after: int,
    created_at,
) -> None:
    existing = await session.execute(
        select(XpLedger).where(
            XpLedger.user_id == user_id,
            XpLedger.source_type == source_type,
            XpLedger.source_id == source_id,
        )
    )
    if existing.scalar_one_or_none() is not None:
        return
    session.add(
        XpLedger(
            user_id=user_id,
            class_id=class_id,
            source_type=source_type,
            source_id=source_id,
            amount=amount,
            balance_after=balance_after,
            created_at=created_at,
        )
    )


async def _create_completed_attempt(
    session: AsyncSession,
    *,
    challenge: Challenge,
    user: User,
    class_id: str,
    accuracy_ratio: float,
    completed_at,
) -> Attempt:
    result = await session.execute(
        select(Challenge)
        .where(Challenge.id == challenge.id)
        .options(selectinload(Challenge.questions).selectinload(Question.options))
    )
    challenge = result.scalar_one()
    questions = sorted(challenge.questions, key=lambda q: q.order)
    total = len(questions)
    target_correct = max(0, min(total, round(total * accuracy_ratio)))

    started_at = completed_at - timedelta(minutes=5)
    attempt = Attempt(
        challenge_id=challenge.id,
        user_id=user.id,
        class_id=class_id,
        status=AttemptStatus.COMPLETED,
        started_at=started_at,
        completed_at=completed_at,
        total_questions=total,
    )
    session.add(attempt)
    await session.flush()

    correct = 0
    earned = 0
    for idx, question in enumerate(questions):
        options = sorted(question.options, key=lambda o: o.order)
        correct_opt = next(o for o in options if o.is_correct)
        wrong_opts = [o for o in options if not o.is_correct]
        pick_correct = idx < target_correct
        selected = correct_opt if pick_correct else wrong_opts[0]
        is_correct = selected.is_correct
        if is_correct:
            correct += 1
            earned += question.points
        session.add(
            AttemptAnswer(
                attempt_id=attempt.id,
                question_id=question.id,
                selected_option_id=selected.id,
                is_correct=is_correct,
                awarded_points=question.points if is_correct else 0,
                answered_at=completed_at,
            )
        )

    accuracy = calculate_accuracy(correct_count=correct, total_questions=total)
    total_points = sum(q.points for q in questions)
    score = calculate_attempt_score(earned_points=earned, total_points=total_points)
    xp = calculate_attempt_xp(accuracy_percent=accuracy)

    attempt.correct_count = correct
    attempt.incorrect_count = total - correct
    attempt.accuracy_percent = accuracy
    attempt.score = score
    attempt.xp_awarded = xp
    attempt.duration_seconds = int((completed_at - started_at).total_seconds())
    await session.flush()
    return attempt


async def _create_ready_challenge_from_fixture(
    session: AsyncSession,
    *,
    topic: Topic,
    teacher_id: str,
    subject_name: str,
    topic_name: str,
) -> Challenge:
    fixture = validate_ai_challenge_output(
        get_fixture(subject_name=subject_name, topic_name=topic_name, question_count=5),
        expected_count=5,
    )
    result = await session.execute(
        select(Challenge).where(
            Challenge.topic_id == topic.id,
            Challenge.status == ChallengeStatus.READY,
            Challenge.title == fixture["title"],
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        return existing

    challenge = Challenge(
        topic_id=topic.id,
        created_by_id=teacher_id,
        origin=ChallengeOrigin.SYSTEM,
        type=ChallengeType.AI_PRACTICE,
        title=fixture["title"],
        status=ChallengeStatus.READY,
        question_count=len(fixture["questions"]),
        published_at=utcnow(),
    )
    session.add(challenge)
    await session.flush()
    await _add_questions_from_fixture(session, challenge, fixture)
    return challenge


async def _get_or_create_user(
    session: AsyncSession, identifier: str, name: str, role: UserRole
) -> User:
    result = await session.execute(select(User).where(User.identifier == identifier))
    user = result.scalar_one_or_none()
    if user:
        if not user.password_hash:
            user.password_hash = hash_password(DEMO_PASSWORD)
            await session.flush()
        return user
    user = User(
        identifier=identifier,
        display_name=name,
        role=role,
        onboarding_completed=True,
        password_hash=hash_password(DEMO_PASSWORD),
    )
    session.add(user)
    await session.flush()
    return user


async def _get_or_create_class(session: AsyncSession, teacher: User) -> SchoolClass:
    result = await session.execute(select(SchoolClass).where(SchoolClass.name == "9A"))
    school_class = result.scalar_one_or_none()
    if school_class:
        return school_class
    school_class = SchoolClass(
        name="9A", grade="9", description="Demo class", created_by_id=teacher.id
    )
    session.add(school_class)
    await session.flush()
    session.add(
        ClassMembership(
            class_id=school_class.id,
            user_id=teacher.id,
            role=MembershipRole.TEACHER,
        )
    )
    await session.flush()
    return school_class


async def _ensure_membership(
    session: AsyncSession, class_id: str, user_id: str, role: MembershipRole
) -> None:
    result = await session.execute(
        select(ClassMembership).where(
            ClassMembership.class_id == class_id,
            ClassMembership.user_id == user_id,
        )
    )
    if result.scalar_one_or_none() is None:
        session.add(ClassMembership(class_id=class_id, user_id=user_id, role=role))
        await session.flush()


async def _get_or_create_subject(
    session: AsyncSession,
    class_id: str,
    teacher_id: str,
    name: str,
    *,
    aliases: tuple[str, ...] = (),
) -> Subject:
    result = await session.execute(
        select(Subject).where(
            Subject.class_id == class_id,
            Subject.name.in_((name, *aliases)),
        )
    )
    subject = result.scalars().first()
    if subject:
        subject.name = name
        return subject
    subject = Subject(class_id=class_id, name=name, created_by_id=teacher_id)
    session.add(subject)
    await session.flush()
    return subject


async def _get_or_create_topic(
    session: AsyncSession, subject_id: str, teacher_id: str, title: str
) -> Topic:
    result = await session.execute(
        select(Topic).where(Topic.subject_id == subject_id, Topic.title == title)
    )
    topic = result.scalar_one_or_none()
    if topic:
        return topic
    topic = Topic(subject_id=subject_id, title=title, created_by_id=teacher_id)
    session.add(topic)
    await session.flush()
    return topic


async def _add_questions_from_fixture(
    session: AsyncSession, challenge: Challenge, fixture: dict
) -> None:
    for idx, q_data in enumerate(fixture["questions"]):
        question = Question(
            challenge_id=challenge.id,
            order=idx + 1,
            type=q_data["type"],
            prompt=q_data["prompt"],
            explanation=q_data.get("explanation"),
            points=q_data.get("points", 1),
        )
        session.add(question)
        await session.flush()
        for opt_idx, opt in enumerate(q_data["options"]):
            session.add(
                QuestionOption(
                    question_id=question.id,
                    order=opt_idx + 1,
                    text=opt["text"],
                    is_correct=opt["is_correct"],
                )
            )
    await session.flush()


async def _get_or_create_ready_challenge(
    session: AsyncSession, topic: Topic, teacher_id: str, *, subject_name: str, topic_name: str
) -> Challenge:
    result = await session.execute(
        select(Challenge).where(
            Challenge.topic_id == topic.id,
            Challenge.status == ChallengeStatus.READY,
        )
    )
    challenge = result.scalar_one_or_none()
    if challenge:
        return challenge

    fixture = validate_ai_challenge_output(
        get_fixture(subject_name=subject_name, topic_name=topic_name, question_count=5),
        expected_count=5,
    )
    challenge = Challenge(
        topic_id=topic.id,
        created_by_id=teacher_id,
        origin=ChallengeOrigin.SYSTEM,
        type=ChallengeType.AI_PRACTICE,
        title=fixture["title"],
        status=ChallengeStatus.READY,
        question_count=len(fixture["questions"]),
        published_at=utcnow(),
    )
    session.add(challenge)
    await session.flush()
    await _add_questions_from_fixture(session, challenge, fixture)
    return challenge
