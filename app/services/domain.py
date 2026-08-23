from __future__ import annotations

import asyncio
import json
from datetime import datetime, timedelta, timezone

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.cache import get_cache
from app.core.enums import (
    ActivityEventType,
    AttemptStatus,
    ChallengeOrigin,
    ChallengeStatus,
    ChallengeType,
    ClassStatus,
    DuelStatus,
    EntityStatus,
    MembershipRole,
    MembershipStatus,
    UserRole,
    UserStatus,
    XpSourceType,
)
from app.core.errors import AppError, ERROR_CODES
from app.core.security import (
    create_access_token,
    generate_refresh_token,
    hash_otp,
    hash_token,
    refresh_expires_at,
    verify_otp,
)
from app.core.settings import Settings, get_settings
from app.db.concurrency import advisory_lock
from app.models.entities import (
    ActivityEvent,
    AiGenerationJob,
    Attempt,
    AttemptAnswer,
    Challenge,
    ClassMembership,
    Duel,
    OtpChallenge,
    Question,
    QuestionOption,
    RefreshSession,
    SchoolClass,
    StudentStats,
    Subject,
    Topic,
    TopicProgress,
    User,
    XpLedger,
    duel_expires_at,
    new_uuid,
    utcnow,
)
from app.services.calculations import (
    calculate_accuracy,
    calculate_attempt_score,
    calculate_attempt_xp,
    calculate_class_analytics,
    calculate_duel_bonus,
    calculate_leaderboard_rank_data,
    calculate_level,
    calculate_streak,
    calculate_topic_mastery,
    level_progress,
    resolve_duel_winner,
    to_local_date,
)
from app.services.orchestrator import get_orchestrator

_finish_locks: dict[str, asyncio.Lock] = {}


def _finish_lock(attempt_id: str) -> asyncio.Lock:
    if attempt_id not in _finish_locks:
        _finish_locks[attempt_id] = asyncio.Lock()
    return _finish_locks[attempt_id]


class AuthService:
    def __init__(self, db: AsyncSession, settings: Settings | None = None) -> None:
        self.db = db
        self.settings = settings or get_settings()
        self.cache = get_cache()

    async def request_otp(self, identifier: str) -> dict:
        cache_key = f"otp:cooldown:{identifier}"
        if await self.cache.get(cache_key):
            raise AppError(
                ERROR_CODES.OTP_RATE_LIMITED,
                "Please wait before requesting another code",
                status_code=429,
            )

        result = await self.db.execute(select(User).where(User.identifier == identifier))
        existing = result.scalar_one_or_none()
        if existing is not None and existing.status == UserStatus.BLOCKED:
            raise AppError(ERROR_CODES.USER_BLOCKED, "User is blocked", status_code=403)

        code = self.settings.otp_demo_code if self.settings.otp_demo_mode else "123456"
        challenge = OtpChallenge(
            identifier=identifier,
            code_hash=hash_otp(code),
            expires_at=utcnow() + timedelta(minutes=self.settings.otp_ttl_minutes),
        )
        self.db.add(challenge)
        await self.cache.set(
            cache_key,
            True,
            ttl=self.settings.redis_otp_cooldown_seconds,
        )
        return {"sent": True, "demo_code": code if self.settings.otp_demo_mode else None}

    async def verify_otp(self, identifier: str, code: str) -> dict:
        result = await self.db.execute(
            select(OtpChallenge)
            .where(
                OtpChallenge.identifier == identifier,
                OtpChallenge.consumed_at.is_(None),
            )
            .order_by(OtpChallenge.created_at.desc())
            .limit(1)
        )
        challenge = result.scalar_one_or_none()
        if challenge is None:
            raise AppError(ERROR_CODES.OTP_INVALID, "Invalid OTP", status_code=401)

        if challenge.expires_at < utcnow():
            raise AppError(ERROR_CODES.OTP_EXPIRED, "OTP expired", status_code=401)

        if challenge.attempts_count >= self.settings.otp_max_verify_attempts:
            raise AppError(ERROR_CODES.OTP_TOO_MANY_ATTEMPTS, "Too many attempts", status_code=429)

        challenge.attempts_count += 1
        if not verify_otp(code, challenge.code_hash):
            await self.db.flush()
            raise AppError(ERROR_CODES.OTP_INVALID, "Invalid OTP", status_code=401)

        challenge.consumed_at = utcnow()
        user, is_new_user = await self._get_or_create_user(identifier)
        if user.status == UserStatus.BLOCKED:
            raise AppError(ERROR_CODES.USER_BLOCKED, "User is blocked", status_code=403)

        tokens = await self._issue_tokens(user)
        tokens["is_new_user"] = is_new_user
        return tokens

    async def refresh(self, refresh_token: str) -> dict:
        token_hash = hash_token(refresh_token)
        result = await self.db.execute(
            select(RefreshSession).where(RefreshSession.token_hash == token_hash)
        )
        session = result.scalar_one_or_none()
        if session is None:
            raise AppError(ERROR_CODES.REFRESH_INVALID, "Invalid refresh token", status_code=401)
        if session.revoked_at is not None:
            await self._revoke_family(session.family_id)
            await self.db.commit()
            if session.replaced_by_id is not None:
                raise AppError(ERROR_CODES.REFRESH_REUSED, "Refresh token reused", status_code=401)
            raise AppError(ERROR_CODES.SESSION_REVOKED, "Session revoked", status_code=401)
        if session.expires_at < utcnow():
            raise AppError(ERROR_CODES.REFRESH_EXPIRED, "Refresh token expired", status_code=401)

        user = await self.db.get(User, session.user_id)
        if user is None:
            raise AppError(ERROR_CODES.REFRESH_INVALID, "User not found", status_code=401)
        if user.status == UserStatus.BLOCKED:
            raise AppError(ERROR_CODES.USER_BLOCKED, "User is blocked", status_code=403)

        now = utcnow()
        session.revoked_at = now
        session.last_used_at = now

        new_refresh = generate_refresh_token()
        new_session = RefreshSession(
            user_id=user.id,
            token_hash=hash_token(new_refresh),
            family_id=session.family_id,
            expires_at=refresh_expires_at(self.settings),
        )
        self.db.add(new_session)
        await self.db.flush()
        session.replaced_by_id = new_session.id

        access = create_access_token(user_id=user.id, role=user.role, settings=self.settings)
        return {
            "access_token": access,
            "refresh_token": new_refresh,
            "token_type": "Bearer",
            "user": self._user_dict(user),
        }

    async def logout(self, user: User, refresh_token: str | None) -> None:
        if refresh_token:
            token_hash = hash_token(refresh_token)
            result = await self.db.execute(
                select(RefreshSession).where(
                    RefreshSession.user_id == user.id,
                    RefreshSession.token_hash == token_hash,
                )
            )
            session = result.scalar_one_or_none()
            if session and session.revoked_at is None:
                session.revoked_at = utcnow()

    async def _revoke_family(self, family_id: str) -> None:
        now = utcnow()
        result = await self.db.execute(
            select(RefreshSession).where(
                RefreshSession.family_id == family_id,
                RefreshSession.revoked_at.is_(None),
            )
        )
        for family_session in result.scalars().all():
            family_session.revoked_at = now
        await self.db.flush()

    async def _get_or_create_user(self, identifier: str) -> tuple[User, bool]:
        result = await self.db.execute(select(User).where(User.identifier == identifier))
        user = result.scalar_one_or_none()
        if user is None:
            role = UserRole.TEACHER if identifier.startswith("teacher@") else UserRole.STUDENT
            user = User(
                identifier=identifier,
                display_name=identifier.split("@")[0],
                role=role,
            )
            self.db.add(user)
            await self.db.flush()
            return user, True
        return user, False

    async def _issue_tokens(self, user: User) -> dict:
        refresh = generate_refresh_token()
        session = RefreshSession(
            user_id=user.id,
            token_hash=hash_token(refresh),
            family_id=new_uuid(),
            expires_at=refresh_expires_at(self.settings),
        )
        self.db.add(session)
        await self.db.flush()
        access = create_access_token(user_id=user.id, role=user.role, settings=self.settings)
        return {
            "access_token": access,
            "refresh_token": refresh,
            "token_type": "Bearer",
            "user": self._user_dict(user),
        }

    @staticmethod
    def _user_dict(user: User) -> dict:
        return {
            "id": user.id,
            "role": user.role,
            "identifier": user.identifier,
            "display_name": user.display_name,
            "avatar_url": user.avatar_url,
            "status": user.status,
            "onboarding_completed": user.onboarding_completed,
        }


class MembershipService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def ensure_member(self, user_id: str, class_id: str) -> ClassMembership:
        result = await self.db.execute(
            select(ClassMembership).where(
                ClassMembership.user_id == user_id,
                ClassMembership.class_id == class_id,
                ClassMembership.status == MembershipStatus.ACTIVE,
            )
        )
        membership = result.scalar_one_or_none()
        if membership is None:
            raise AppError(ERROR_CODES.CLASS_ACCESS_DENIED, "Not a class member", status_code=403)
        return membership

    async def get_class_for_user(self, user: User, class_id: str) -> SchoolClass:
        school_class = await self.db.get(SchoolClass, class_id)
        if school_class is None:
            raise AppError(ERROR_CODES.CLASS_NOT_FOUND, "Class not found", status_code=404)
        if school_class.status != ClassStatus.ACTIVE:
            raise AppError(ERROR_CODES.CLASS_ARCHIVED, "Class archived", status_code=410)
        if user.role == UserRole.ADMIN:
            return school_class
        await self.ensure_member(user.id, class_id)
        return school_class

    async def is_teacher_of_class(self, user: User, class_id: str) -> bool:
        if user.role == UserRole.ADMIN:
            return True
        result = await self.db.execute(
            select(ClassMembership).where(
                ClassMembership.user_id == user.id,
                ClassMembership.class_id == class_id,
                ClassMembership.status == MembershipStatus.ACTIVE,
                ClassMembership.role == MembershipRole.TEACHER,
            )
        )
        return result.scalar_one_or_none() is not None

    async def ensure_class_teacher(self, user: User, class_id: str) -> None:
        if not await self.is_teacher_of_class(user, class_id):
            raise AppError(
                ERROR_CODES.FORBIDDEN,
                "Not a teacher of this class",
                status_code=403,
            )

    async def join_class(self, user: User, invite_code: str) -> SchoolClass:
        result = await self.db.execute(
            select(SchoolClass).where(
                SchoolClass.invite_code == invite_code.strip().upper()
            )
        )
        school_class = result.scalar_one_or_none()
        if school_class is None:
            raise AppError(ERROR_CODES.INVITE_CODE_INVALID, "Invalid invite code", status_code=404)
        if school_class.status != ClassStatus.ACTIVE:
            raise AppError(ERROR_CODES.CLASS_ARCHIVED, "Class archived", status_code=410)

        existing = await self.db.execute(
            select(ClassMembership).where(
                ClassMembership.class_id == school_class.id,
                ClassMembership.user_id == user.id,
            )
        )
        membership = existing.scalar_one_or_none()
        if membership is not None:
            if membership.status == MembershipStatus.ACTIVE:
                raise AppError(ERROR_CODES.ALREADY_CLASS_MEMBER, "Already a member", status_code=409)
            membership.status = MembershipStatus.ACTIVE
            membership.role = MembershipRole.STUDENT
            await self.db.flush()
            return school_class

        self.db.add(
            ClassMembership(
                class_id=school_class.id,
                user_id=user.id,
                role=MembershipRole.STUDENT,
            )
        )
        self.db.add(
            ActivityEvent(
                class_id=school_class.id,
                user_id=user.id,
                event_type=ActivityEventType.MEMBER_JOINED,
                payload=json.dumps({"userId": user.id}),
            )
        )
        await self.db.flush()
        return school_class

    async def list_class_members(self, class_id: str) -> list[dict]:
        result = await self.db.execute(
            select(ClassMembership, User, StudentStats)
            .join(User, User.id == ClassMembership.user_id)
            .outerjoin(
                StudentStats,
                and_(
                    StudentStats.user_id == ClassMembership.user_id,
                    StudentStats.class_id == class_id,
                ),
            )
            .where(
                ClassMembership.class_id == class_id,
                ClassMembership.status == MembershipStatus.ACTIVE,
            )
        )
        members: list[dict] = []
        for membership, member, stats in result.all():
            members.append(
                {
                    "user_id": member.id,
                    "display_name": member.display_name,
                    "role": membership.role,
                    "joined_at": membership.joined_at,
                    "level": stats.level if stats else 0,
                    "total_xp": stats.total_xp if stats else 0,
                    "streak": stats.streak if stats else 0,
                    "status": membership.status,
                }
            )
        return members

    async def remove_member(self, user: User, class_id: str, target_user_id: str) -> None:
        await self.get_class_for_user(user, class_id)
        await self.ensure_class_teacher(user, class_id)
        result = await self.db.execute(
            select(ClassMembership).where(
                ClassMembership.class_id == class_id,
                ClassMembership.user_id == target_user_id,
            )
        )
        membership = result.scalar_one_or_none()
        if membership is None:
            raise AppError(ERROR_CODES.MEMBER_NOT_FOUND, "Member not found", status_code=404)
        if (
            membership.role == MembershipRole.TEACHER
            and membership.status == MembershipStatus.ACTIVE
        ):
            teacher_count = await self.db.execute(
                select(func.count())
                .select_from(ClassMembership)
                .where(
                    ClassMembership.class_id == class_id,
                    ClassMembership.status == MembershipStatus.ACTIVE,
                    ClassMembership.role == MembershipRole.TEACHER,
                )
            )
            if int(teacher_count.scalar_one()) <= 1:
                raise AppError(
                    ERROR_CODES.CANNOT_REMOVE_LAST_TEACHER,
                    "Cannot remove last teacher",
                    status_code=409,
                )
        membership.status = MembershipStatus.REMOVED
        await self.db.flush()


class AttemptService:
    def __init__(self, db: AsyncSession, settings: Settings | None = None) -> None:
        self.db = db
        self.settings = settings or get_settings()

    async def finish_attempt(self, user: User, attempt_id: str) -> Attempt:
        async with _finish_lock(attempt_id):
            attempt = await self.db.get(
                Attempt,
                attempt_id,
                options=[
                    selectinload(Attempt.answers),
                    selectinload(Attempt.challenge).selectinload(Challenge.questions).selectinload(
                        Question.options
                    ),
                ],
            )
            if attempt is None:
                raise AppError(ERROR_CODES.ATTEMPT_NOT_FOUND, "Attempt not found", status_code=404)
            if attempt.user_id != user.id:
                raise AppError(ERROR_CODES.FORBIDDEN, "Not your attempt", status_code=403)
            if attempt.status == AttemptStatus.COMPLETED:
                return attempt
            if attempt.status != AttemptStatus.IN_PROGRESS:
                raise AppError(ERROR_CODES.INVALID_ATTEMPT_STATE, "Invalid attempt state")

            questions = attempt.challenge.questions
            if len(attempt.answers) < len(questions):
                raise AppError(
                    ERROR_CODES.ATTEMPT_HAS_UNANSWERED_QUESTIONS,
                    "All questions must be answered",
                )

            correct = sum(1 for a in attempt.answers if a.is_correct)
            total = len(questions)
            earned = sum(
                q.points
                for q in questions
                for a in attempt.answers
                if a.question_id == q.id and a.is_correct
            )
            total_points = sum(q.points for q in questions)
            accuracy = calculate_accuracy(correct_count=correct, total_questions=total)
            score = calculate_attempt_score(earned_points=earned, total_points=total_points)
            xp = calculate_attempt_xp(accuracy_percent=accuracy)

            attempt.status = AttemptStatus.COMPLETED
            attempt.correct_count = correct
            attempt.total_questions = total
            attempt.accuracy_percent = accuracy
            attempt.score = score
            attempt.xp_awarded = xp
            attempt.completed_at = utcnow()
            if attempt.started_at:
                attempt.duration_seconds = int(
                    (attempt.completed_at - attempt.started_at).total_seconds()
                )

            existing_xp = await self.db.execute(
                select(XpLedger).where(
                    XpLedger.user_id == user.id,
                    XpLedger.source_type == XpSourceType.ATTEMPT,
                    XpLedger.source_id == attempt.id,
                )
            )
            if existing_xp.scalar_one_or_none() is None:
                self.db.add(
                    XpLedger(
                        user_id=user.id,
                        class_id=attempt.class_id,
                        source_type=XpSourceType.ATTEMPT,
                        source_id=attempt.id,
                        amount=xp,
                    )
                )
                await self._update_stats(
                    user.id,
                    attempt.class_id,
                    xp,
                    attempt.completed_at,
                    correct_count=correct,
                    total_questions=total,
                )
                await self._update_topic_progress(user.id, attempt.challenge.topic_id, accuracy)
                self.db.add(
                    ActivityEvent(
                        class_id=attempt.class_id,
                        user_id=user.id,
                        event_type=ActivityEventType.ATTEMPT_COMPLETED,
                        payload=json.dumps({"attempt_id": attempt.id, "score": score}),
                    )
                )
                await get_cache().delete(f"leaderboard:{attempt.class_id}:all")
                await get_cache().delete(f"leaderboard:{attempt.class_id}:week")

            await self._maybe_complete_duel(attempt)
            await self.db.flush()
            return attempt

    async def _update_stats(
        self,
        user_id: str,
        class_id: str,
        xp: int,
        completed_at: datetime,
        *,
        correct_count: int = 0,
        total_questions: int = 0,
        skip_attempt_increment: bool = False,
    ) -> None:
        result = await self.db.execute(
            select(StudentStats).where(
                StudentStats.user_id == user_id,
                StudentStats.class_id == class_id,
            )
        )
        stats = result.scalar_one_or_none()
        activity_date = to_local_date(completed_at, self.settings.app_timezone)
        if stats is None:
            streak = 1
            stats = StudentStats(
                user_id=user_id,
                class_id=class_id,
                total_xp=xp,
                level=calculate_level(xp),
                streak=streak,
                best_streak=streak,
                last_activity_date=activity_date,
                attempts_completed=0 if skip_attempt_increment else 1,
                total_correct_answers=0 if skip_attempt_increment else correct_count,
                total_answers=0 if skip_attempt_increment else total_questions,
                average_accuracy=(
                    calculate_accuracy(correct_count=correct_count, total_questions=total_questions)
                    if not skip_attempt_increment and total_questions > 0
                    else 0.0
                ),
                last_attempt_at=None if skip_attempt_increment else completed_at,
            )
            self.db.add(stats)
        else:
            stats.total_xp += xp
            stats.level = calculate_level(stats.total_xp)
            stats.streak = calculate_streak(
                current_streak=stats.streak,
                last_activity_date=stats.last_activity_date,
                activity_date=activity_date,
            )
            stats.best_streak = max(stats.best_streak, stats.streak)
            stats.last_activity_date = activity_date
            if not skip_attempt_increment:
                stats.attempts_completed += 1
                stats.total_correct_answers += correct_count
                stats.total_answers += total_questions
                if stats.total_answers > 0:
                    stats.average_accuracy = calculate_accuracy(
                        correct_count=stats.total_correct_answers,
                        total_questions=stats.total_answers,
                    )
                stats.last_attempt_at = completed_at

    async def _update_topic_progress(self, user_id: str, topic_id: str, accuracy: float) -> None:
        result = await self.db.execute(
            select(Attempt.accuracy_percent)
            .join(Challenge, Attempt.challenge_id == Challenge.id)
            .where(
                Attempt.user_id == user_id,
                Challenge.topic_id == topic_id,
                Attempt.status == AttemptStatus.COMPLETED,
                Attempt.accuracy_percent.is_not(None),
            )
            .order_by(Attempt.completed_at.desc())
            .limit(5)
        )
        accuracies = [float(row[0]) for row in result.all()]
        if accuracy not in accuracies:
            accuracies.insert(0, accuracy)
        mastery, category = calculate_topic_mastery(accuracies)
        prog_result = await self.db.execute(
            select(TopicProgress).where(
                TopicProgress.user_id == user_id,
                TopicProgress.topic_id == topic_id,
            )
        )
        progress = prog_result.scalar_one_or_none()
        if progress is None:
            progress = TopicProgress(
                user_id=user_id,
                topic_id=topic_id,
                mastery_percent=mastery,
                mastery_category=category,
                attempts_count=1,
            )
            self.db.add(progress)
        else:
            progress.mastery_percent = mastery
            progress.mastery_category = category
            progress.attempts_count += 1

    async def _maybe_complete_duel(self, attempt: Attempt) -> None:
        result = await self.db.execute(
            select(Duel).where(
                (Duel.creator_attempt_id == attempt.id) | (Duel.opponent_attempt_id == attempt.id),
            )
        )
        duel = result.scalar_one_or_none()
        if duel is None or duel.status == DuelStatus.COMPLETED:
            return
        if duel.status not in (DuelStatus.PENDING, DuelStatus.ACCEPTED):
            return

        creator_attempt = await self.db.get(Attempt, duel.creator_attempt_id)
        opponent_attempt = (
            await self.db.get(Attempt, duel.opponent_attempt_id) if duel.opponent_attempt_id else None
        )
        if not (
            creator_attempt
            and creator_attempt.status == AttemptStatus.COMPLETED
            and opponent_attempt
            and opponent_attempt.status == AttemptStatus.COMPLETED
        ):
            return

        from app.services.calculations import DuelParticipantResult

        winner = resolve_duel_winner(
            DuelParticipantResult(
                user_id=duel.creator_id,
                score=creator_attempt.score or 0,
                correct_count=creator_attempt.correct_count or 0,
                duration_seconds=creator_attempt.duration_seconds or 999999,
            ),
            DuelParticipantResult(
                user_id=duel.opponent_id or "",
                score=opponent_attempt.score or 0,
                correct_count=opponent_attempt.correct_count or 0,
                duration_seconds=opponent_attempt.duration_seconds or 999999,
            ),
        )

        now = utcnow()
        duel.status = DuelStatus.COMPLETED
        duel.completed_at = now
        duel.updated_at = now
        if winner == "DRAW":
            duel.winner_id = None
            duel.result_type = "DRAW"
        else:
            duel.winner_id = winner
            duel.result_type = (
                "CHALLENGER_WIN" if winner == duel.creator_id else "OPPONENT_WIN"
            )

        if winner != "DRAW":
            bonus = calculate_duel_bonus()
            existing = await self.db.execute(
                select(XpLedger).where(
                    XpLedger.user_id == winner,
                    XpLedger.source_type == XpSourceType.DUEL_WIN,
                    XpLedger.source_id == duel.id,
                )
            )
            if existing.scalar_one_or_none() is None:
                self.db.add(
                    XpLedger(
                        user_id=winner,
                        class_id=duel.class_id,
                        source_type=XpSourceType.DUEL_WIN,
                        source_id=duel.id,
                        amount=bonus,
                    )
                )
                await self._update_stats(
                    winner,
                    duel.class_id,
                    bonus,
                    now,
                    skip_attempt_increment=True,
                )
            stats_result = await self.db.execute(
                select(StudentStats).where(
                    StudentStats.user_id == winner,
                    StudentStats.class_id == duel.class_id,
                )
            )
            winner_stats = stats_result.scalar_one_or_none()
            if winner_stats:
                winner_stats.duels_won += 1

            loser_id = duel.opponent_id if winner == duel.creator_id else duel.creator_id
            if loser_id:
                loser_result = await self.db.execute(
                    select(StudentStats).where(
                        StudentStats.user_id == loser_id,
                        StudentStats.class_id == duel.class_id,
                    )
                )
                loser_stats = loser_result.scalar_one_or_none()
                if loser_stats:
                    loser_stats.duels_lost += 1
            await get_cache().delete(f"leaderboard:{duel.class_id}:all")
            await get_cache().delete(f"leaderboard:{duel.class_id}:week")
        else:
            for participant_id in (duel.creator_id, duel.opponent_id):
                if not participant_id:
                    continue
                draw_result = await self.db.execute(
                    select(StudentStats).where(
                        StudentStats.user_id == participant_id,
                        StudentStats.class_id == duel.class_id,
                    )
                )
                participant_stats = draw_result.scalar_one_or_none()
                if participant_stats:
                    participant_stats.duels_drawn += 1

        existing_event = await self.db.execute(
            select(ActivityEvent).where(
                ActivityEvent.class_id == duel.class_id,
                ActivityEvent.event_type == ActivityEventType.DUEL_COMPLETED,
            )
        )
        already_logged = any(
            e.payload and duel.id in e.payload for e in existing_event.scalars().all()
        )
        if not already_logged:
            self.db.add(
                ActivityEvent(
                    class_id=duel.class_id,
                    user_id=duel.winner_id,
                    event_type=ActivityEventType.DUEL_COMPLETED,
                    payload=json.dumps(
                        {
                            "duel_id": duel.id,
                            "winner_id": duel.winner_id,
                            "result_type": duel.result_type,
                        }
                    ),
                )
            )


_duel_accept_locks: dict[str, asyncio.Lock] = {}


def _duel_lock(share_code: str) -> asyncio.Lock:
    if share_code not in _duel_accept_locks:
        _duel_accept_locks[share_code] = asyncio.Lock()
    return _duel_accept_locks[share_code]


class DuelService:
    def __init__(self, db: AsyncSession, settings: Settings | None = None) -> None:
        self.db = db
        self.settings = settings or get_settings()

    async def accept_duel(self, user: User, share_code: str) -> tuple[Duel, Attempt, Challenge]:
        async with _duel_lock(share_code):
            await advisory_lock(self.db, f"duel:accept:{share_code}")
            result = await self.db.execute(
                select(Duel).where(Duel.share_code == share_code).with_for_update()
            )
            duel = result.scalar_one_or_none()
            if duel is None:
                raise AppError(ERROR_CODES.DUEL_NOT_FOUND, "Duel not found", status_code=404)
            if duel.creator_id == user.id:
                raise AppError(ERROR_CODES.CANNOT_DUEL_SELF, "Cannot accept own duel", status_code=409)
            if duel.expires_at < utcnow():
                duel.status = DuelStatus.EXPIRED
                duel.updated_at = utcnow()
                await self.db.flush()
                raise AppError(ERROR_CODES.DUEL_EXPIRED, "Duel expired", status_code=410)
            if duel.status != DuelStatus.PENDING:
                raise AppError(
                    ERROR_CODES.DUEL_ALREADY_ACCEPTED, "Duel already accepted", status_code=409
                )

            challenge = await self.db.get(
                Challenge,
                duel.challenge_id,
                options=[
                    selectinload(Challenge.questions).selectinload(Question.options),
                    selectinload(Challenge.topic),
                ],
            )
            if challenge is None or challenge.status != ChallengeStatus.READY:
                raise AppError(ERROR_CODES.CHALLENGE_NOT_READY, "Challenge not ready", status_code=409)

            await MembershipService(self.db).ensure_member(user.id, duel.class_id)

            opponent_attempt = Attempt(
                challenge_id=challenge.id,
                user_id=user.id,
                class_id=duel.class_id,
                status=AttemptStatus.IN_PROGRESS,
                total_questions=challenge.question_count,
            )
            self.db.add(opponent_attempt)
            await self.db.flush()

            now = utcnow()
            duel.opponent_id = user.id
            duel.opponent_attempt_id = opponent_attempt.id
            duel.status = DuelStatus.ACCEPTED
            duel.accepted_at = now
            duel.updated_at = now
            await self.db.flush()
            return duel, opponent_attempt, challenge


class LeaderboardService:
    def __init__(self, db: AsyncSession, settings: Settings | None = None) -> None:
        self.db = db
        self.settings = settings or get_settings()
        self.cache = get_cache()

    async def for_class(
        self, user: User, class_id: str, *, period: str = "all", limit: int = 50
    ) -> dict:
        await MembershipService(self.db).ensure_member(user.id, class_id)
        cache_key = f"leaderboard:{class_id}:{period}"
        cached = await self.cache.get(cache_key)
        if cached:
            return cached

        since = self._week_start() if period == "week" else None
        stats_by_user: dict[str, StudentStats] = {}
        users_by_id: dict[str, User] = {}
        result = await self.db.execute(
            select(StudentStats, User)
            .join(User, User.id == StudentStats.user_id)
            .where(StudentStats.class_id == class_id)
        )
        rows: list[tuple[str, str, int, int, int, int]] = []
        for stats, member in result.all():
            stats_by_user[stats.user_id] = stats
            users_by_id[stats.user_id] = member
            xp = stats.total_xp
            if since is not None:
                xp_result = await self.db.execute(
                    select(func.coalesce(func.sum(XpLedger.amount), 0)).where(
                        XpLedger.user_id == stats.user_id,
                        XpLedger.class_id == class_id,
                        XpLedger.created_at >= since,
                    )
                )
                xp = int(xp_result.scalar_one())
            rows.append(
                (
                    stats.user_id,
                    member.display_name,
                    xp,
                    stats.level,
                    stats.streak,
                    stats.attempts_completed,
                )
            )

        ranked = calculate_leaderboard_rank_data(rows)
        current_rank = next(
            (item.rank for item in ranked if item.user_id == user.id),
            None,
        )
        entries = []
        for item in ranked[:limit]:
            member = users_by_id.get(item.user_id)
            stats = stats_by_user.get(item.user_id)
            entries.append(
                {
                    "rank": item.rank,
                    "user": AuthService._user_dict(member) if member else {"id": item.user_id},
                    "total_xp": item.total_xp if since is None else stats.total_xp if stats else 0,
                    "period_xp": item.total_xp if since is not None else None,
                    "completed_challenges": stats.attempts_completed if stats else 0,
                    "current_streak": item.streak,
                    "is_current_user": item.user_id == user.id,
                }
            )

        payload = {
            "period": period,
            "entries": entries,
            "current_user_rank": current_rank,
        }
        await self.cache.set(cache_key, payload, ttl=self.settings.redis_leaderboard_ttl_seconds)
        return payload

    def _week_start(self):
        from datetime import timedelta
        from zoneinfo import ZoneInfo

        tz = ZoneInfo(self.settings.app_timezone)
        now = utcnow().astimezone(tz)
        start = now - timedelta(days=now.weekday())
        return start.replace(hour=0, minute=0, second=0, microsecond=0).astimezone(
            ZoneInfo("UTC")
        )
