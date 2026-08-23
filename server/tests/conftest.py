from __future__ import annotations

import asyncio
from collections.abc import AsyncGenerator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from server.core.cache import reset_cache
from server.core.settings import clear_settings_cache
from server.db.base import Base
from server.db.session import reset_db_state
from server.main import create_app
from server.services.orchestrator import reset_orchestrator

TEST_DB_URL = "sqlite+aiosqlite:///:memory:"


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(autouse=True)
def _env(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", TEST_DB_URL)
    monkeypatch.setenv("AGENTROUTER_API_KEY", "test-key")
    monkeypatch.setenv("JWT_SECRET", "test-jwt-secret")
    monkeypatch.setenv("OTP_DEMO_MODE", "true")
    monkeypatch.setenv("OTP_DEMO_CODE", "123456")
    monkeypatch.setenv("AI_USE_FALLBACK_ON_ERROR", "true")
    clear_settings_cache()
    reset_db_state()
    reset_cache()
    reset_orchestrator()
    yield
    clear_settings_cache()
    reset_db_state()
    reset_cache()
    reset_orchestrator()


@pytest_asyncio.fixture
async def db_engine():
    engine = create_async_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()


@pytest_asyncio.fixture
async def session_factory(db_engine):
    return async_sessionmaker(db_engine, class_=AsyncSession, expire_on_commit=False)


@pytest_asyncio.fixture
async def client(db_engine, session_factory, monkeypatch) -> AsyncGenerator[AsyncClient, None]:
    monkeypatch.setattr("server.db.session.get_session_factory", lambda: session_factory)
    monkeypatch.setattr("server.db.session.get_engine", lambda: db_engine)

    async def _init_db():
        async with db_engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

    monkeypatch.setattr("server.db.session.init_db", _init_db)

    app = create_app()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


async def auth_headers(client: AsyncClient, identifier: str) -> dict[str, str]:
    await client.post("/api/v1/auth/otp/request", json={"identifier": identifier})
    resp = await client.post(
        "/api/v1/auth/otp/verify",
        json={"identifier": identifier, "code": "123456"},
    )
    token = resp.json()["data"]["access_token"]
    return {"Authorization": f"Bearer {token}"}
