from __future__ import annotations

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
