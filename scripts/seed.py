#!/usr/bin/env python3
"""Run demo database seed."""

import asyncio

from app.core.settings import get_settings
from app.db.session import init_db
from app.seed.demo import run_seed


async def main() -> None:
    settings = get_settings()
    print(f"Seeding {settings.app_name}...")
    await init_db()
    result = await run_seed()
    print("Seed complete:")
    for key, value in result.items():
        print(f"  {key}: {value}")


if __name__ == "__main__":
    asyncio.run(main())
