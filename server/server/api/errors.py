from __future__ import annotations

from typing import Any

import structlog
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import ValidationError

from server.core.errors import ERROR_CODES, AppError, error_response
from server.core.settings import get_settings

logger = structlog.get_logger(__name__)


def register_exception_handlers(app: FastAPI) -> None:
    settings = get_settings()

    @app.exception_handler(AppError)
    async def app_error_handler(_request: Request, exc: AppError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content=error_response(exc.code, exc.message, details=exc.details),
        )

    @app.exception_handler(RequestValidationError)
    async def request_validation_handler(
        _request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        return _validation_error_response(exc.errors())

    @app.exception_handler(ValidationError)
    async def pydantic_validation_handler(_request: Request, exc: ValidationError) -> JSONResponse:
        return _validation_error_response(exc.errors())

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        logger.exception(
            "unhandled_request_exception",
            request_id=getattr(request.state, "request_id", None),
            method=request.method,
            path=request.url.path,
        )
        details: Any = str(exc) if settings.app_debug else None
        return JSONResponse(
            status_code=500,
            content=error_response(
                ERROR_CODES.INTERNAL_ERROR,
                "An unexpected error occurred",
                details=details,
            ),
        )


def _validation_error_response(details: list[Any]) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content=error_response(
            ERROR_CODES.VALIDATION_ERROR,
            "Request validation failed",
            details=details,
        ),
    )
