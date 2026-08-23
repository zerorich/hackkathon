from __future__ import annotations

from typing import Annotated

from fastapi import Depends, Header
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError, ERROR_CODES
from app.core.security import decode_access_token
from app.db.session import get_session as get_db
from app.models.entities import User

DbSession = Annotated[AsyncSession, Depends(get_db)]


async def get_current_user(
    db: DbSession,
    authorization: Annotated[str | None, Header()] = None,
) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise AppError(ERROR_CODES.UNAUTHORIZED, "Missing access token", status_code=401)

    token = authorization.removeprefix("Bearer ").strip()
    try:
        payload = decode_access_token(token)
    except ValueError as exc:
        raise AppError(ERROR_CODES.UNAUTHORIZED, "Invalid access token", status_code=401) from exc

    user = await db.get(User, payload["sub"])
    if user is None:
        raise AppError(ERROR_CODES.UNAUTHORIZED, "User not found", status_code=401)
    if user.status != "ACTIVE":
        raise AppError(ERROR_CODES.USER_BLOCKED, "User is blocked", status_code=403)
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def require_roles(*roles: str):
    async def checker(user: CurrentUser) -> User:
        if user.role not in roles:
            raise AppError(ERROR_CODES.FORBIDDEN, "Insufficient permissions", status_code=403)
        return user

    return Depends(checker)
