from __future__ import annotations

from fastapi import APIRouter

from server.api.deps import CurrentUser, DbSession
from server.api.schemas import (
    LoginBody,
    OtpRequestBody,
    OtpVerifyBody,
    ProfileUpdateBody,
    RefreshBody,
)
from server.core.errors import success_response
from server.core.security import hash_password
from server.services.domain import AuthService

router = APIRouter(tags=["auth"])


@router.post("/otp/request")
async def otp_request(body: OtpRequestBody, db: DbSession):
    data = await AuthService(db).request_otp(body.identifier)
    return success_response(data)


@router.post("/otp/verify")
async def otp_verify(body: OtpVerifyBody, db: DbSession):
    data = await AuthService(db).verify_otp(
        body.identifier, body.code, password=body.password, role=body.role
    )
    return success_response(data)


@router.post("/login")
async def login(body: LoginBody, db: DbSession):
    data = await AuthService(db).login(body.identifier, body.password)
    return success_response(data)


@router.post("/refresh")
async def refresh(body: RefreshBody, db: DbSession):
    data = await AuthService(db).refresh(body.refresh_token)
    return success_response(data)


@router.post("/logout")
async def logout(body: RefreshBody | None, user: CurrentUser, db: DbSession):
    token = body.refresh_token if body else None
    await AuthService(db).logout(user, token)
    return success_response({"logged_out": True})


@router.get("/me")
async def me(user: CurrentUser):
    return success_response(AuthService._user_dict(user))


@router.patch("/me")
async def update_me(body: ProfileUpdateBody, user: CurrentUser, db: DbSession):
    if body.display_name is not None:
        user.display_name = body.display_name
    if body.avatar_url is not None:
        user.avatar_url = body.avatar_url
    if body.onboarding_completed is not None:
        user.onboarding_completed = body.onboarding_completed
    if body.password is not None:
        user.password_hash = hash_password(body.password)
    await db.flush()
    return success_response(AuthService._user_dict(user))
