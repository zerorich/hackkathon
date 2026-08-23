from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


async def advisory_lock(session: AsyncSession, key: str) -> None:
    """Best-effort transactional lock. Uses pg_advisory_xact_lock on PostgreSQL."""
    bind = session.bind
    if bind is not None and bind.dialect.name == "postgresql":
        await session.execute(
            text("SELECT pg_advisory_xact_lock(hashtext(:key))"),
            {"key": key},
        )


@asynccontextmanager
async def integrity_savepoint(session: AsyncSession) -> AsyncIterator[None]:
    """Use a savepoint where concurrent connections support it reliably.

    In-memory SQLite shares one physical connection across async sessions; a
    background worker commit can invalidate another session's savepoint. The
    development fallback therefore relies on the outer request rollback, while
    PostgreSQL retains the narrow savepoint used to translate uniqueness races.
    """
    bind = session.bind
    if bind is not None and bind.dialect.name == "sqlite":
        yield
        return
    async with session.begin_nested():
        yield
