from __future__ import annotations

from sqlalchemy import text

from fastapi import APIRouter

from app.core.errors import success_response
from app.core.settings import get_settings
from app.db.session import get_engine
from app.services.orchestrator import get_orchestrator

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
async def ready():
    checks: dict[str, str] = {"api": "ok"}

    try:
        async with get_engine().connect() as conn:
            await conn.execute(text("SELECT 1"))
        checks["database"] = "ok"
    except Exception:
        checks["database"] = "error"
        return success_response({"status": "not_ready", "checks": checks})

    try:
        get_orchestrator()
        checks["orchestrator"] = "ok"
    except Exception:
        checks["orchestrator"] = "error"

    return success_response({"status": "ready", "checks": checks})
