from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from server import __version__
from server.api.errors import register_exception_handlers
from server.api.middleware import register_middleware
from server.api.router import api_router
from server.core.cache import get_cache
from server.core.logging import setup_logging
from server.core.settings import get_settings
from server.db.session import close_db, get_session_factory, init_db
from server.services.orchestrator import get_orchestrator


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    settings = get_settings()
    setup_logging(debug=settings.app_debug)
    await get_cache().connect()

    await init_db()
    app.state.orchestrator = get_orchestrator()
    app.state.orchestrator.start(session_factory=get_session_factory())

    if settings.seed_on_startup:
        from server.seed.demo import run_seed

        await run_seed()

    try:
        yield
    finally:
        await app.state.orchestrator.close()
        await get_cache().close()
        await close_db()


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
