from __future__ import annotations

from contextlib import asynccontextmanager
from collections.abc import AsyncIterator

from fastapi import FastAPI

from app import __version__
from app.api.errors import register_exception_handlers
from app.api.middleware import register_middleware
from app.api.router import api_router
from app.core.cache import get_cache
from app.core.logging import setup_logging
from app.core.settings import get_settings
from app.db.session import init_db
from app.services.orchestrator import get_orchestrator


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    settings = get_settings()
    setup_logging(debug=settings.app_debug)
    await get_cache().connect()

    await init_db()
    app.state.orchestrator = get_orchestrator()

    if settings.seed_on_startup:
        from app.seed.demo import run_seed

        await run_seed()

    yield

    await app.state.orchestrator.close()
    await get_cache().close()


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title=settings.app_name,
        version=__version__,
        debug=settings.app_debug,
        lifespan=lifespan,
        docs_url="/docs" if settings.is_development else None,
        redoc_url="/redoc" if settings.is_development else None,
    )

    register_middleware(app, settings)
    register_exception_handlers(app)
    app.include_router(api_router, prefix=settings.api_v1_prefix)

    @app.get("/", include_in_schema=False)
    async def root() -> dict[str, str]:
        return {
            "service": settings.app_name,
            "version": __version__,
            "api": settings.api_v1_prefix,
        }

    return app


app = create_app()
