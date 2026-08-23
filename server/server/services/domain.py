from __future__ import annotations

import asyncio
import json
import random
import secrets
from contextlib import asynccontextmanager
from datetime import datetime, timedelta
from typing import ClassVar

import httpx
from sqlalchemy import and_, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from server.core.cache import get_cache
from server.core.enums import (
    ActivityEventType,
    AttemptStatus,
    ChallengeStatus,
    ClassStatus,
    DuelStatus,
    MembershipRole,
    MembershipStatus,
    UserRole,
    UserStatus,
    XpSourceType,
)
from server.core.errors import ERROR_CODES, AppError
from server.core.security import (
    create_access_token,
    generate_refresh_token,
    hash_otp,
    hash_password,
    hash_token,
    refresh_expires_at,
    verify_otp,
    verify_password,
)
from server.core.settings import Settings, get_settings
from server.db.concurrency import advisory_lock, integrity_savepoint
from server.models.entities import (
    ActivityEvent,
    Attempt,
    Challenge,
    ClassMembership,
    Duel,
    OtpChallenge,
    Question,
    RefreshSession,
    SchoolClass,
    StudentStats,
    TopicProgress,
    User,
    XpLedger,
    elapsed_seconds,
    is_before_utc,
    new_uuid,
    utcnow,
)
from server.services.calculations import (
    calculate_accuracy,
    calculate_attempt_score,
    calculate_attempt_xp,
    calculate_duel_bonus,
    calculate_leaderboard_rank_data,
    calculate_level,
    calculate_streak,
    calculate_topic_mastery,
    resolve_duel_winner,
    to_local_date,
)

_refresh_locks: dict[str, tuple[asyncio.Lock, int]] = {}


@asynccontextmanager
async def _transaction_lock(db: AsyncSession, key: str):
    """Hold a cross-worker PostgreSQL lock for the surrounding transaction."""
    await advisory_lock(db, key)
    yield


@asynccontextmanager
async def _refresh_lock(token_hash: str):
    """Serialize refresh rotation in-process (PostgreSQL locks cover other workers)."""
    lock, users = _refresh_locks.get(token_hash, (asyncio.Lock(), 0))
    _refresh_locks[token_hash] = (lock, users + 1)
    try:
        async with lock:
            yield
    finally:
        current = _refresh_locks.get(token_hash)
        if current is not None and current[0] is lock:
            remaining = current[1] - 1
            if remaining == 0:
                _refresh_locks.pop(token_hash, None)
            else:
                _refresh_locks[token_hash] = (lock, remaining)


class AuthService:
    def __init__(self, db: AsyncSession, settings: Settings | None = None) -> None:
        self.db = db
        self.settings = settings or get_settings()
        self.cache = get_cache()

    async def request_otp(self, identifier: str) -> dict:
        identifier = identifier.strip().lower()
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

        if self.settings.otp_demo_mode:
            code = self.settings.otp_demo_code
        else:
            # Never let the documented demo credential authenticate in real mode,
            # even in the one-in-a-million case where the random draw matches it.
            code = self.settings.otp_demo_code
            while code == self.settings.otp_demo_code:
                code = f"{secrets.randbelow(1_000_000):06d}"
        challenge = OtpChallenge(
            identifier=identifier,
            code_hash=hash_otp(code),
            expires_at=utcnow() + timedelta(minutes=self.settings.otp_ttl_minutes),
        )
        self.db.add(challenge)
        await self.db.flush()
        if not self.settings.otp_demo_mode:
            await self._deliver_otp(identifier, code)
        await self.cache.set(
            cache_key,
            True,
            ttl=self.settings.redis_otp_cooldown_seconds,
        )
        return {"sent": True, "demo_code": code if self.settings.otp_demo_mode else None}

    async def verify_otp(
        self,
        identifier: str,
        code: str,
        *,
        password: str | None = None,
        role: str | None = None,
    ) -> dict:
        identifier = identifier.strip().lower()
        verify_key = f"otp:verify:{identifier}"
        verify_attempts = await self.cache.incr(
            verify_key,
            ttl=self.settings.otp_ttl_minutes * 60,
        )
        if verify_attempts > self.settings.otp_max_verify_attempts:
            raise AppError(ERROR_CODES.OTP_TOO_MANY_ATTEMPTS, "Too many attempts", status_code=429)

        await advisory_lock(self.db, f"otp:verify:{identifier}")
        result = await self.db.execute(
            select(OtpChallenge)
            .where(
                OtpChallenge.identifier == identifier,
                OtpChallenge.consumed_at.is_(None),
            )
            .order_by(OtpChallenge.created_at.desc())
            .limit(1)
            .with_for_update()
        )
        challenge = result.scalar_one_or_none()
        if challenge is None:
            raise AppError(ERROR_CODES.OTP_INVALID, "Invalid OTP", status_code=401)

        if is_before_utc(challenge.expires_at, utcnow()):
            raise AppError(ERROR_CODES.OTP_EXPIRED, "OTP expired", status_code=401)

        if challenge.attempts_count >= self.settings.otp_max_verify_attempts:
            raise AppError(ERROR_CODES.OTP_TOO_MANY_ATTEMPTS, "Too many attempts", status_code=429)

        challenge.attempts_count += 1
        if not verify_otp(code, challenge.code_hash):
            await self.db.flush()
            raise AppError(ERROR_CODES.OTP_INVALID, "Invalid OTP", status_code=401)

        challenge.consumed_at = utcnow()
        user, is_new_user = await self._get_or_create_user(identifier, role=role)
        if is_new_user and password:
            user.password_hash = hash_password(password)
            await self.db.flush()
        if user.status == UserStatus.BLOCKED:
            raise AppError(ERROR_CODES.USER_BLOCKED, "User is blocked", status_code=403)

        tokens = await self._issue_tokens(user)
        await self.cache.delete(verify_key)
        tokens["is_new_user"] = is_new_user
        return tokens

    async def login(self, identifier: str, password: str) -> dict:
        identifier = identifier.strip().lower()
        result = await self.db.execute(select(User).where(User.identifier == identifier))
        user = result.scalar_one_or_none()
        if user is None:
            raise AppError(
                ERROR_CODES.INVALID_CREDENTIALS, "Login yoki parol noto'g'ri", status_code=401
            )
        if user.status == UserStatus.BLOCKED:
            raise AppError(ERROR_CODES.USER_BLOCKED, "User is blocked", status_code=403)
        if not user.password_hash:
            raise AppError(
                ERROR_CODES.PASSWORD_NOT_SET,
                "Bu hisobda parol o'rnatilmagan — kod orqali kiring",
                status_code=409,
            )
        if not verify_password(password, user.password_hash):
            raise AppError(
                ERROR_CODES.INVALID_CREDENTIALS, "Login yoki parol noto'g'ri", status_code=401
            )
        return await self._issue_tokens(user)

    async def refresh(self, refresh_token: str) -> dict:
        token_hash = hash_token(refresh_token)
        async with _refresh_lock(token_hash):
            return await self._refresh_locked(token_hash)

    async def _refresh_locked(self, token_hash: str) -> dict:
        await advisory_lock(self.db, f"refresh:{token_hash}")
        result = await self.db.execute(
            select(RefreshSession).where(RefreshSession.token_hash == token_hash).with_for_update()
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
        if is_before_utc(session.expires_at, utcnow()):
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

        # Commit before releasing the in-process lock. Without this, a concurrent
        # SQLite/single-worker request can read the old token before FastAPI closes
        # and commits this dependency session.
        await self.db.commit()

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

    async def _get_or_create_user(
        self, identifier: str, *, role: str | None = None
    ) -> tuple[User, bool]:
        result = await self.db.execute(select(User).where(User.identifier == identifier))
        user = result.scalar_one_or_none()
        if user is None:
            resolved_role = UserRole.STUDENT
            if self.settings.is_development and self.settings.otp_demo_mode:
                demo_roles = {
                    "teacher@demo.local": UserRole.TEACHER,
                    "admin@demo.local": UserRole.ADMIN,
                }
                resolved_role = demo_roles.get(identifier, UserRole.STUDENT)
            if role in (UserRole.STUDENT, UserRole.TEACHER):
                resolved_role = role
            user = User(
                identifier=identifier,
                display_name=identifier.split("@")[0],
                role=resolved_role,
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
            "has_password": bool(user.password_hash),
        }

    @staticmethod
    def public_user_dict(user: User) -> dict:
        return {
            "id": user.id,
            "display_name": user.display_name,
            "avatar_url": user.avatar_url,
        }

    async def _deliver_otp(self, identifier: str, code: str) -> None:
        url = self.settings.otp_delivery_webhook_url
        if not url:
            raise AppError(
                ERROR_CODES.INTERNAL_ERROR,
                "OTP delivery is not configured",
                status_code=503,
            )
        try:
            async with httpx.AsyncClient(
                timeout=self.settings.http_client_timeout_seconds
            ) as client:
                response = await client.post(url, json={"identifier": identifier, "code": code})
                response.raise_for_status()
        except httpx.HTTPError as exc:
            raise AppError(
                ERROR_CODES.INTERNAL_ERROR,
                "OTP delivery failed",
                status_code=503,
            ) from exc


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
            select(SchoolClass).where(SchoolClass.invite_code == invite_code.strip().upper())
        )
        school_class = result.scalar_one_or_none()
        if school_class is None:
            raise AppError(ERROR_CODES.INVITE_CODE_INVALID, "Invalid invite code", status_code=404)
        if school_class.status != ClassStatus.ACTIVE:
            raise AppError(ERROR_CODES.CLASS_ARCHIVED, "Class archived", status_code=410)

        await advisory_lock(self.db, f"class:join:{school_class.id}:{user.id}")
        existing = await self.db.execute(
            select(ClassMembership)
            .where(
                ClassMembership.class_id == school_class.id,
                ClassMembership.user_id == user.id,
            )
            .with_for_update()
        )
        membership = existing.scalar_one_or_none()
        if membership is not None:
            if membership.status == MembershipStatus.ACTIVE:
                raise AppError(
                    ERROR_CODES.ALREADY_CLASS_MEMBER, "Already a member", status_code=409
                )
            membership.status = MembershipStatus.ACTIVE
            membership.role = MembershipRole.STUDENT
            await self.db.flush()
            return school_class

        try:
            async with integrity_savepoint(self.db):
                self.db.add(
                    ClassMembership(
                        class_id=school_class.id,
                        user_id=user.id,
                        role=MembershipRole.STUDENT,
                    )
                )
                await self.db.flush()
        except IntegrityError:
            raise AppError(
                ERROR_CODES.ALREADY_CLASS_MEMBER,
                "Already a member",
                status_code=409,
            ) from None
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
                    "identifier": member.identifier,
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
        async with _transaction_lock(self.db, f"attempt:finish:{attempt_id}"):
            result = await self.db.execute(
                select(Attempt)
                .where(Attempt.id == attempt_id)
                .with_for_update()
                .options(
                    selectinload(Attempt.answers),
                    selectinload(Attempt.challenge)
                    .selectinload(Challenge.questions)
                    .selectinload(Question.options),
                )
            )
            attempt = result.scalar_one_or_none()
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
            attempt.incorrect_count = total - correct
            attempt.total_questions = total
            attempt.accuracy_percent = accuracy
            attempt.score = score
            attempt.xp_awarded = xp
            attempt.completed_at = utcnow()
            if attempt.started_at:
                attempt.duration_seconds = elapsed_seconds(attempt.started_at, attempt.completed_at)

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
        await advisory_lock(self.db, f"stats:{user_id}:{class_id}")
        result = await self.db.execute(
            select(StudentStats)
            .where(
                StudentStats.user_id == user_id,
                StudentStats.class_id == class_id,
            )
            .with_for_update()
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
        await advisory_lock(self.db, f"topic-progress:{user_id}:{topic_id}")
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
            select(TopicProgress)
            .where(
                TopicProgress.user_id == user_id,
                TopicProgress.topic_id == topic_id,
            )
            .with_for_update()
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
        if duel is None:
            return
        await advisory_lock(self.db, f"duel:complete:{duel.id}")
        locked = await self.db.execute(
            select(Duel)
            .where(Duel.id == duel.id)
            .with_for_update()
            .execution_options(populate_existing=True)
        )
        duel = locked.scalar_one()
        if duel.status == DuelStatus.COMPLETED:
            return
        if duel.status not in (DuelStatus.PENDING, DuelStatus.ACCEPTED):
            return

        creator_attempt = await self.db.get(Attempt, duel.creator_attempt_id)
        opponent_attempt = (
            await self.db.get(Attempt, duel.opponent_attempt_id)
            if duel.opponent_attempt_id
            else None
        )
        if not (
            creator_attempt
            and creator_attempt.status == AttemptStatus.COMPLETED
            and opponent_attempt
            and opponent_attempt.status == AttemptStatus.COMPLETED
        ):
            return

        from server.services.calculations import DuelParticipantResult

        winner = resolve_duel_winner(
            DuelParticipantResult(
                user_id=duel.creator_id,
                score=creator_attempt.score or 0,
                correct_count=creator_attempt.correct_count or 0,
                duration_seconds=(
                    creator_attempt.duration_seconds
                    if creator_attempt.duration_seconds is not None
                    else 999999
                ),
            ),
            DuelParticipantResult(
                user_id=duel.opponent_id or "",
                score=opponent_attempt.score or 0,
                correct_count=opponent_attempt.correct_count or 0,
                duration_seconds=(
                    opponent_attempt.duration_seconds
                    if opponent_attempt.duration_seconds is not None
                    else 999999
                ),
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
            duel.result_type = "CHALLENGER_WIN" if winner == duel.creator_id else "OPPONENT_WIN"

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
                select(StudentStats)
                .where(
                    StudentStats.user_id == winner,
                    StudentStats.class_id == duel.class_id,
                )
                .with_for_update()
            )
            winner_stats = stats_result.scalar_one_or_none()
            if winner_stats:
                winner_stats.duels_won += 1

            loser_id = duel.opponent_id if winner == duel.creator_id else duel.creator_id
            if loser_id:
                await advisory_lock(self.db, f"stats:{loser_id}:{duel.class_id}")
                loser_result = await self.db.execute(
                    select(StudentStats)
                    .where(
                        StudentStats.user_id == loser_id,
                        StudentStats.class_id == duel.class_id,
                    )
                    .with_for_update()
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
                await advisory_lock(self.db, f"stats:{participant_id}:{duel.class_id}")
                draw_result = await self.db.execute(
                    select(StudentStats)
                    .where(
                        StudentStats.user_id == participant_id,
                        StudentStats.class_id == duel.class_id,
                    )
                    .with_for_update()
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


class DuelService:
    def __init__(self, db: AsyncSession, settings: Settings | None = None) -> None:
        self.db = db
        self.settings = settings or get_settings()

    async def accept_duel(self, user: User, share_code: str) -> tuple[Duel, Attempt, Challenge]:
        async with _transaction_lock(self.db, f"duel:accept:{share_code}"):
            result = await self.db.execute(
                select(Duel).where(Duel.share_code == share_code).with_for_update()
            )
            duel = result.scalar_one_or_none()
            if duel is None:
                raise AppError(ERROR_CODES.DUEL_NOT_FOUND, "Duel not found", status_code=404)
            if duel.creator_id == user.id:
                raise AppError(
                    ERROR_CODES.CANNOT_DUEL_SELF, "Cannot accept own duel", status_code=409
                )
            if is_before_utc(duel.expires_at, utcnow()):
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
                raise AppError(
                    ERROR_CODES.CHALLENGE_NOT_READY, "Challenge not ready", status_code=409
                )

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

    BOT_IDENTIFIER = "bot@zehna"
    BOT_ACCURACY_BY_DIFFICULTY: ClassVar[dict[str, float]] = {
        "EASY": 0.88,
        "MEDIUM": 0.72,
        "HARD": 0.55,
    }

    async def _get_or_create_bot(self) -> User:
        result = await self.db.execute(select(User).where(User.identifier == self.BOT_IDENTIFIER))
        bot = result.scalar_one_or_none()
        if bot is None:
            bot = User(
                identifier=self.BOT_IDENTIFIER,
                display_name="Zehn AI Bot",
                avatar_url="dragon",
                role=UserRole.STUDENT,
                onboarding_completed=True,
            )
            self.db.add(bot)
            await self.db.flush()
        elif bot.display_name != "Zehn AI Bot":
            # Keep the stable identifier for existing duel references while
            # migrating the user-facing product name lazily and safely.
            bot.display_name = "Zehn AI Bot"
            await self.db.flush()
        return bot

    async def create_bot_duel(self, user: User, attempt_id: str) -> Duel:
        attempt = await self.db.get(
            Attempt,
            attempt_id,
            options=[selectinload(Attempt.challenge).selectinload(Challenge.questions)],
        )
        if attempt is None:
            raise AppError(ERROR_CODES.ATTEMPT_NOT_FOUND, "Attempt not found", status_code=404)
        if attempt.user_id != user.id:
            raise AppError(ERROR_CODES.FORBIDDEN, "Not your attempt", status_code=403)
        if attempt.status != AttemptStatus.COMPLETED:
            raise AppError(
                ERROR_CODES.INVALID_ATTEMPT_STATE,
                "Attempt must be completed before creating a duel",
                status_code=409,
            )
        existing = await self.db.execute(select(Duel).where(Duel.creator_attempt_id == attempt.id))
        existing_duel = existing.scalar_one_or_none()
        if existing_duel:
            raise AppError(
                ERROR_CODES.DUEL_ALREADY_EXISTS,
                "Duel already exists for this attempt",
                status_code=409,
                details={"duel_id": existing_duel.id},
            )

        bot = await self._get_or_create_bot()
        questions = attempt.challenge.questions
        total_points = sum(q.points for q in questions) or 1
        p_correct = self.BOT_ACCURACY_BY_DIFFICULTY.get(attempt.challenge.difficulty, 0.7)
        correctness = [random.random() < p_correct for _ in questions]
        earned = sum(q.points for q, is_correct in zip(questions, correctness) if is_correct)
        correct_count = sum(correctness)
        accuracy = calculate_accuracy(correct_count=correct_count, total_questions=len(questions))
        score = calculate_attempt_score(earned_points=earned, total_points=total_points)
        bot_xp = calculate_attempt_xp(accuracy_percent=accuracy)
        duration = random.randint(20, 90)

        now = utcnow()
        bot_attempt = Attempt(
            challenge_id=attempt.challenge_id,
            user_id=bot.id,
            class_id=attempt.class_id,
            status=AttemptStatus.COMPLETED,
            score=score,
            correct_count=correct_count,
            incorrect_count=len(questions) - correct_count,
            total_questions=len(questions),
            accuracy_percent=accuracy,
            xp_awarded=bot_xp,
            duration_seconds=duration,
            started_at=now,
            completed_at=now,
        )
        self.db.add(bot_attempt)
        await self.db.flush()

        duel = Duel(
            class_id=attempt.class_id,
            challenge_id=attempt.challenge_id,
            creator_attempt_id=attempt.id,
            creator_id=user.id,
            opponent_id=bot.id,
            opponent_attempt_id=bot_attempt.id,
            status=DuelStatus.ACCEPTED,
            accepted_at=now,
            expires_at=now,
        )
        self.db.add(duel)
        await self.db.flush()
        bot_attempt.duel_id = duel.id

        from server.services.calculations import DuelParticipantResult

        winner = resolve_duel_winner(
            DuelParticipantResult(
                user_id=user.id,
                score=attempt.score or 0,
                correct_count=attempt.correct_count or 0,
                duration_seconds=attempt.duration_seconds or 999999,
            ),
            DuelParticipantResult(
                user_id=bot.id,
                score=bot_attempt.score or 0,
                correct_count=bot_attempt.correct_count or 0,
                duration_seconds=bot_attempt.duration_seconds or 999999,
            ),
        )
        duel.status = DuelStatus.COMPLETED
        duel.completed_at = now
        duel.updated_at = now
        if winner == "DRAW":
            duel.winner_id = None
            duel.result_type = "DRAW"
        elif winner == user.id:
            duel.winner_id = user.id
            duel.result_type = "CHALLENGER_WIN"
            bonus = calculate_duel_bonus()
            self.db.add(
                XpLedger(
                    user_id=user.id,
                    class_id=attempt.class_id,
                    source_type=XpSourceType.DUEL_WIN,
                    source_id=duel.id,
                    amount=bonus,
                )
            )
            await AttemptService(self.db)._update_stats(
                user.id, attempt.class_id, bonus, now, skip_attempt_increment=True
            )
            stats_result = await self.db.execute(
                select(StudentStats).where(
                    StudentStats.user_id == user.id, StudentStats.class_id == attempt.class_id
                )
            )
            winner_stats = stats_result.scalar_one_or_none()
            if winner_stats:
                winner_stats.duels_won += 1
        else:
            duel.winner_id = bot.id
            duel.result_type = "OPPONENT_WIN"
            loser_result = await self.db.execute(
                select(StudentStats).where(
                    StudentStats.user_id == user.id, StudentStats.class_id == attempt.class_id
                )
            )
            loser_stats = loser_result.scalar_one_or_none()
            if loser_stats:
                loser_stats.duels_lost += 1

        self.db.add(
            ActivityEvent(
                class_id=attempt.class_id,
                user_id=user.id,
                event_type=ActivityEventType.DUEL_COMPLETED,
                payload=json.dumps(
                    {
                        "duel_id": duel.id,
                        "winner_id": duel.winner_id,
                        "result_type": duel.result_type,
                        "bot": True,
                    }
                ),
            )
        )
        await get_cache().delete(f"leaderboard:{attempt.class_id}:all")
        await get_cache().delete(f"leaderboard:{attempt.class_id}:week")
        await self.db.flush()
        return duel


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
        base_entries = await self.cache.get(cache_key)
        if base_entries is None:
            since = (
                self._week_start()
                if period == "week"
                else self._month_start()
                if period == "month"
                else None
            )
            period_xp = None
            if since is not None:
                period_xp = (
                    select(
                        XpLedger.user_id.label("user_id"),
                        func.coalesce(func.sum(XpLedger.amount), 0).label("xp"),
                    )
                    .where(XpLedger.class_id == class_id, XpLedger.created_at >= since)
                    .group_by(XpLedger.user_id)
                    .subquery()
                )
                query = (
                    select(StudentStats, User, func.coalesce(period_xp.c.xp, 0))
                    .join(User, User.id == StudentStats.user_id)
                    .outerjoin(period_xp, period_xp.c.user_id == StudentStats.user_id)
                    .where(StudentStats.class_id == class_id)
                )
            else:
                query = (
                    select(StudentStats, User, StudentStats.total_xp)
                    .join(User, User.id == StudentStats.user_id)
                    .where(StudentStats.class_id == class_id)
                )

            result = await self.db.execute(query)
            source: dict[str, tuple[StudentStats, User, int]] = {}
            rank_rows: list[tuple[str, str, int, int, int, int]] = []
            for stats, member, ranked_xp in result.all():
                xp = int(ranked_xp or 0)
                source[stats.user_id] = (stats, member, xp)
                rank_rows.append(
                    (
                        stats.user_id,
                        member.display_name,
                        xp,
                        stats.level,
                        stats.streak,
                        stats.attempts_completed,
                    )
                )
            ranked = calculate_leaderboard_rank_data(rank_rows)
            base_entries = []
            for item in ranked:
                stats, member, xp = source[item.user_id]
                base_entries.append(
                    {
                        "rank": item.rank,
                        "user": AuthService.public_user_dict(member),
                        "total_xp": stats.total_xp,
                        "period_xp": xp if since is not None else None,
                        "completed_challenges": stats.attempts_completed,
                        "current_streak": stats.streak,
                    }
                )
            await self.cache.set(
                cache_key,
                base_entries,
                ttl=self.settings.redis_leaderboard_ttl_seconds,
            )

        current_rank = next(
            (entry["rank"] for entry in base_entries if entry["user"]["id"] == user.id),
            None,
        )
        entries = [
            {
                **entry,
                "is_current_user": entry["user"]["id"] == user.id,
            }
            for entry in base_entries[:limit]
        ]
        return {
            "period": period,
            "entries": entries,
            "current_user_rank": current_rank,
        }

    def _week_start(self):
        from datetime import timedelta
        from zoneinfo import ZoneInfo

        tz = ZoneInfo(self.settings.app_timezone)
        now = utcnow().astimezone(tz)
        start = now - timedelta(days=now.weekday())
        return start.replace(hour=0, minute=0, second=0, microsecond=0).astimezone(ZoneInfo("UTC"))

    def _month_start(self):
        from zoneinfo import ZoneInfo

        tz = ZoneInfo(self.settings.app_timezone)
        now = utcnow().astimezone(tz)
        start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        return start.astimezone(ZoneInfo("UTC"))
