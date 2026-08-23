from __future__ import annotations

import time
import uuid
from collections.abc import Awaitable, Callable

import structlog
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

from server.core.settings import Settings

RequestHandler = Callable[[Request], Awaitable[Response]]

REQUEST_ID_HEADER = "X-Request-Id"
REQUEST_TIME_HEADER = "X-Response-Time-Ms"


class RequestContextMiddleware(BaseHTTPMiddleware):
    """Attach request id and emit structured access logs with timing."""

    async def dispatch(self, request: Request, call_next: RequestHandler) -> Response:
        request_id = request.headers.get(REQUEST_ID_HEADER) or str(uuid.uuid4())
        request.state.request_id = request_id

        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(
            request_id=request_id,
            method=request.method,
            path=request.url.path,
        )

        started = time.perf_counter()
        response = await call_next(request)
        elapsed_ms = round((time.perf_counter() - started) * 1000, 2)

        response.headers[REQUEST_ID_HEADER] = request_id
        response.headers[REQUEST_TIME_HEADER] = str(elapsed_ms)

        structlog.get_logger("http.access").info(
            "request_completed",
            status_code=response.status_code,
            duration_ms=elapsed_ms,
        )
        return response


def configure_cors(app: FastAPI, settings: Settings) -> None:
    origins = _cors_origins(settings)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=[REQUEST_ID_HEADER, REQUEST_TIME_HEADER],
    )


def _cors_origins(settings: Settings) -> list[str]:
    import os

    raw = os.getenv("CORS_ORIGINS", "")
    if raw.strip():
        return [origin.strip() for origin in raw.split(",") if origin.strip()]
    if settings.is_development:
        return [
            "http://localhost:5173",
            "http://localhost:5174",
            "http://127.0.0.1:5173",
            "http://127.0.0.1:5174",
        ]
    return []


def register_middleware(app: FastAPI, settings: Settings) -> None:
    configure_cors(app, settings)
    app.add_middleware(RequestContextMiddleware)
