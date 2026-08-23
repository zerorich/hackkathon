from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Query
from sqlalchemy import func, select

from app.api.deps import CurrentUser, DbSession, require_roles
from app.core.enums import UserRole
from app.core.errors import success_response
from app.models.entities import AiGenerationJob, Attempt, Challenge, Duel, SchoolClass, User
from app.services.domain import AuthService

router = APIRouter(tags=["admin"])
Admin = Annotated[CurrentUser, require_roles(UserRole.ADMIN)]


@router.get("/overview")
async def admin_overview(_user: Admin, db: DbSession):
    users = await db.scalar(select(func.count()).select_from(User))
    students = await db.scalar(select(func.count()).select_from(User).where(User.role == UserRole.STUDENT))
    teachers = await db.scalar(select(func.count()).select_from(User).where(User.role == UserRole.TEACHER))
    classes = await db.scalar(select(func.count()).select_from(SchoolClass))
    attempts = await db.scalar(select(func.count()).select_from(Attempt))
    ai_jobs = await db.scalar(select(func.count()).select_from(AiGenerationJob))
    ai_failures = await db.scalar(
        select(func.count()).select_from(AiGenerationJob).where(AiGenerationJob.status == "FAILED")
    )
    duels = await db.scalar(select(func.count()).select_from(Duel))
    return success_response(
        {
            "total_users": users or 0,
            "total_students": students or 0,
            "total_teachers": teachers or 0,
            "total_classes": classes or 0,
            "total_attempts": attempts or 0,
            "ai_generations": ai_jobs or 0,
            "ai_failures": ai_failures or 0,
            "duels": duels or 0,
        }
    )


@router.get("/users")
async def admin_users(
    _user: Admin,
    db: DbSession,
    role: Annotated[str | None, Query()] = None,
    status: Annotated[str | None, Query()] = None,
    search: Annotated[str | None, Query()] = None,
):
    query = select(User)
    if role:
        query = query.where(User.role == role)
    if status:
        query = query.where(User.status == status)
    if search:
        query = query.where(User.identifier.contains(search) | User.display_name.contains(search))
    result = await db.execute(query.order_by(User.created_at.desc()).limit(100))
    return success_response(
        [{"user": AuthService._user_dict(u), "created_at": u.created_at} for u in result.scalars()]
    )


@router.patch("/users/{target_user_id}/status")
async def admin_update_user_status(
    target_user_id: str,
    body: dict,
    _user: Admin,
    db: DbSession,
):
    user = await db.get(User, target_user_id)
    if user:
        user.status = body.get("status", user.status)
        await db.flush()
    return success_response({"success": True})


@router.get("/challenges")
async def admin_challenges(
    _user: Admin,
    db: DbSession,
    status: Annotated[str | None, Query()] = None,
    origin: Annotated[str | None, Query()] = None,
    search: Annotated[str | None, Query()] = None,
):
    query = select(Challenge)
    if status:
        query = query.where(Challenge.status == status)
    if origin:
        query = query.where(Challenge.origin == origin)
    if search:
        query = query.where(Challenge.title.contains(search))
    result = await db.execute(query.order_by(Challenge.created_at.desc()).limit(100))
    return success_response(
        [
            {
                "id": c.id,
                "title": c.title,
                "topic_id": c.topic_id,
                "status": c.status,
                "origin": c.origin,
                "created_at": c.created_at,
            }
            for c in result.scalars()
        ]
    )


@router.patch("/challenges/{challenge_id}/status")
async def admin_update_challenge_status(
    challenge_id: str,
    body: dict,
    _user: Admin,
    db: DbSession,
):
    challenge = await db.get(Challenge, challenge_id)
    if challenge:
        challenge.status = body.get("status", challenge.status)
        await db.flush()
    return success_response({"success": True})


@router.get("/ai-jobs")
async def admin_ai_jobs(
    _user: Admin,
    db: DbSession,
    status: Annotated[str | None, Query()] = None,
):
    query = select(AiGenerationJob)
    if status:
        query = query.where(AiGenerationJob.status == status)
    result = await db.execute(query.order_by(AiGenerationJob.created_at.desc()).limit(100))
    return success_response(
        [
            {
                "id": j.id,
                "challenge_id": j.challenge_id,
                "status": j.status,
                "error_message": j.error_message,
                "created_at": j.created_at,
            }
            for j in result.scalars()
        ]
    )


@router.post("/ai-jobs/{job_id}/retry")
async def admin_retry_ai_job(job_id: str, _user: Admin, db: DbSession):
    from app.db.session import get_session_factory
    from app.services.orchestrator import get_orchestrator

    job = await db.get(AiGenerationJob, job_id)
    if job:
        job.status = "PENDING"
        job.error_message = None
        await db.flush()
        get_orchestrator().schedule(job_id=job.id, session_factory=get_session_factory())
    return success_response({"job_id": job_id, "status": "PENDING"})
