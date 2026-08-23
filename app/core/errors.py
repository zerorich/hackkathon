from __future__ import annotations

from typing import Any

from fastapi import Request
from fastapi.responses import JSONResponse


class ERROR_CODES:
    VALIDATION_ERROR = "VALIDATION_ERROR"
    UNAUTHORIZED = "UNAUTHORIZED"
    FORBIDDEN = "FORBIDDEN"
    NOT_FOUND = "NOT_FOUND"
    CONFLICT = "CONFLICT"
    RATE_LIMITED = "RATE_LIMITED"
    INTERNAL_ERROR = "INTERNAL_ERROR"

    OTP_INVALID = "OTP_INVALID"
    OTP_EXPIRED = "OTP_EXPIRED"
    OTP_TOO_MANY_ATTEMPTS = "OTP_TOO_MANY_ATTEMPTS"
    OTP_RATE_LIMITED = "OTP_RATE_LIMITED"
    REFRESH_INVALID = "REFRESH_INVALID"
    REFRESH_EXPIRED = "REFRESH_EXPIRED"
    REFRESH_REUSED = "REFRESH_REUSED"
    SESSION_REVOKED = "SESSION_REVOKED"
    USER_BLOCKED = "USER_BLOCKED"

    CLASS_NOT_FOUND = "CLASS_NOT_FOUND"
    CLASS_ACCESS_DENIED = "CLASS_ACCESS_DENIED"
    CLASS_ARCHIVED = "CLASS_ARCHIVED"
    INVITE_CODE_INVALID = "INVITE_CODE_INVALID"
    ALREADY_CLASS_MEMBER = "ALREADY_CLASS_MEMBER"
    MEMBER_NOT_FOUND = "MEMBER_NOT_FOUND"
    CANNOT_REMOVE_LAST_TEACHER = "CANNOT_REMOVE_LAST_TEACHER"

    SUBJECT_NOT_FOUND = "SUBJECT_NOT_FOUND"
    SUBJECT_HAS_ACTIVE_CONTENT = "SUBJECT_HAS_ACTIVE_CONTENT"
    TOPIC_NOT_FOUND = "TOPIC_NOT_FOUND"
    TOPIC_ARCHIVED = "TOPIC_ARCHIVED"

    CHALLENGE_NOT_FOUND = "CHALLENGE_NOT_FOUND"
    CHALLENGE_NOT_READY = "CHALLENGE_NOT_READY"
    CHALLENGE_ARCHIVED = "CHALLENGE_ARCHIVED"
    CHALLENGE_ACCESS_DENIED = "CHALLENGE_ACCESS_DENIED"
    AI_GENERATION_LIMIT = "AI_GENERATION_LIMIT"
    AI_PROVIDER_UNAVAILABLE = "AI_PROVIDER_UNAVAILABLE"
    AI_OUTPUT_INVALID = "AI_OUTPUT_INVALID"
    INVALID_QUESTION = "INVALID_QUESTION"
    INVALID_CORRECT_OPTION_COUNT = "INVALID_CORRECT_OPTION_COUNT"

    ATTEMPT_NOT_FOUND = "ATTEMPT_NOT_FOUND"
    ATTEMPT_ALREADY_COMPLETED = "ATTEMPT_ALREADY_COMPLETED"
    ATTEMPT_HAS_UNANSWERED_QUESTIONS = "ATTEMPT_HAS_UNANSWERED_QUESTIONS"
    INVALID_ATTEMPT_STATE = "INVALID_ATTEMPT_STATE"
    QUESTION_NOT_IN_CHALLENGE = "QUESTION_NOT_IN_CHALLENGE"
    OPTION_NOT_IN_QUESTION = "OPTION_NOT_IN_QUESTION"

    DUEL_NOT_FOUND = "DUEL_NOT_FOUND"
    DUEL_EXPIRED = "DUEL_EXPIRED"
    DUEL_ALREADY_ACCEPTED = "DUEL_ALREADY_ACCEPTED"
    DUEL_ALREADY_EXISTS = "DUEL_ALREADY_EXISTS"
    DUEL_ALREADY_COMPLETED = "DUEL_ALREADY_COMPLETED"
    CANNOT_DUEL_SELF = "CANNOT_DUEL_SELF"
    INVALID_DUEL_STATE = "INVALID_DUEL_STATE"


class AppError(Exception):
    def __init__(
        self,
        code: str,
        message: str,
        *,
        status_code: int = 400,
        details: Any = None,
    ) -> None:
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details
        super().__init__(message)


def error_response(code: str, message: str, *, details: Any = None) -> dict[str, Any]:
    payload: dict[str, Any] = {"code": code, "message": message}
    if details is not None:
        payload["details"] = details
    return {"error": payload}


def success_response(data: Any) -> dict[str, Any]:
    return {"data": data}


async def app_error_handler(_request: Request, exc: AppError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content=error_response(exc.code, exc.message, details=exc.details),
    )


async def unhandled_error_handler(_request: Request, exc: Exception) -> JSONResponse:
    return JSONResponse(
        status_code=500,
        content=error_response(ERROR_CODES.INTERNAL_ERROR, "Internal server error"),
    )
