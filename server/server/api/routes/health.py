from __future__ import annotations

from fastapi import APIRouter, Response, status
from sqlalchemy import text

from server.core.cache import get_cache
from server.core.errors import success_response
from server.core.settings import get_settings
from server.db.session import get_engine
from server.services.orchestrator import get_orchestrator

router = APIRouter(tags=["health"])


@router.get("/health")
async def health():
    settings = get_settings()
    return success_response(
        {
            "status": "ok",
            "service": settings.app_name,
            "env": settings.app_env.value,
        }
    )


@router.get("/ready")
async def ready(response: Response):
    checks: dict[str, str] = {"api": "ok"}

    try:
        async with get_engine().connect() as conn:
            await conn.execute(text("SELECT 1"))
        checks["database"] = "ok"
    except Exception:  # noqa: BLE001 -- readiness must report any dependency failure
        checks["database"] = "error"

    try:
        checks["redis"] = "ok" if await get_cache().ping() else "error"
    except Exception:  # noqa: BLE001 -- readiness must report any dependency failure
        checks["redis"] = "error"

    checks["worker"] = "ok" if get_orchestrator().is_running else "error"
    ready_status = all(value == "ok" for value in checks.values())
    if not ready_status:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    return success_response({"status": "ready" if ready_status else "not_ready", "checks": checks})
