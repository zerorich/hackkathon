from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter
from sqlalchemy import select

from server.api.deps import CurrentUser, DbSession, require_roles
from server.api.schemas import ClassCreateBody, ClassJoinBody
from server.core.errors import success_response
from server.core.enums import MembershipRole, MembershipStatus, UserRole
from server.models.entities import ClassMembership, SchoolClass
from server.services.domain import MembershipService

router = APIRouter(tags=["classes"])
Teacher = Annotated[CurrentUser, require_roles(UserRole.TEACHER, UserRole.ADMIN)]
Student = Annotated[CurrentUser, require_roles(UserRole.STUDENT)]


def _can_see_invite_code(user: CurrentUser) -> bool:
    return user.role in (UserRole.TEACHER, UserRole.ADMIN)


@router.get("/")
async def list_classes(user: CurrentUser, db: DbSession):
    result = await db.execute(
        select(SchoolClass)
        .join(ClassMembership, ClassMembership.class_id == SchoolClass.id)
        .where(
            ClassMembership.user_id == user.id,
            ClassMembership.status == MembershipStatus.ACTIVE,
        )
    )
    classes = result.scalars().unique().all()
    return success_response(
        [
            {
                "id": c.id,
                "name": c.name,
                "grade": c.grade,
                "description": c.description,
                "invite_code": c.invite_code if _can_see_invite_code(user) else None,
                "status": c.status,
            }
            for c in classes
        ]
    )


@router.post("/")
async def create_class(body: ClassCreateBody, user: Teacher, db: DbSession):
    school_class = SchoolClass(
        name=body.name,
        grade=body.grade,
        description=body.description,
        created_by_id=user.id,
    )
    db.add(school_class)
    await db.flush()
    db.add(
        ClassMembership(
            class_id=school_class.id,
            user_id=user.id,
            role=MembershipRole.TEACHER,
        )
    )
    await db.flush()
    return success_response(
        {
            "id": school_class.id,
            "name": school_class.name,
            "grade": school_class.grade,
            "invite_code": school_class.invite_code,
        }
    )


@router.get("/{class_id}")
async def get_class(class_id: str, user: CurrentUser, db: DbSession):
    svc = MembershipService(db)
    school_class = await svc.get_class_for_user(user, class_id)
    return success_response(
        {
            "id": school_class.id,
            "name": school_class.name,
            "grade": school_class.grade,
            "description": school_class.description,
            "invite_code": school_class.invite_code if _can_see_invite_code(user) else None,
            "status": school_class.status,
        }
    )


@router.post("/join")
async def join_class(body: ClassJoinBody, user: Student, db: DbSession):
    svc = MembershipService(db)
    school_class = await svc.join_class(user, body.invite_code)
    return success_response({"class_id": school_class.id, "name": school_class.name})


@router.get("/{class_id}/members")
async def list_members(class_id: str, user: Teacher, db: DbSession):
    svc = MembershipService(db)
    await svc.get_class_for_user(user, class_id)
    await svc.ensure_class_teacher(user, class_id)
    members = await svc.list_class_members(class_id)
    return success_response(members)


@router.delete("/{class_id}/members/{user_id}")
async def remove_member(class_id: str, user_id: str, user: Teacher, db: DbSession):
    svc = MembershipService(db)
    await svc.remove_member(user, class_id, user_id)
    return success_response({"removed": True})
