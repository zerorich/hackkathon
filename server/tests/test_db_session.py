from __future__ import annotations

import pytest
from sqlalchemy import text

from server.db.session import close_db, get_engine


@pytest.mark.asyncio
async def test_sqlite_connections_enable_foreign_keys():
    engine = get_engine()
    try:
        async with engine.connect() as connection:
            enabled = await connection.scalar(text("PRAGMA foreign_keys"))
        assert enabled == 1
    finally:
        await close_db()
