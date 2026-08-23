from __future__ import annotations

import asyncio
import time
from collections.abc import Awaitable, Callable

from server.agents.models import AgentResult, AgentRole


async def run_bounded_parallel(
    jobs: list[tuple[str, AgentRole, Callable[[], Awaitable[AgentResult]]]],
    *,
    max_concurrency: int = 3,
    cancel_remaining_on_failure: bool = True,
) -> list[AgentResult]:
    if not jobs:
        return []

    semaphore = asyncio.Semaphore(max_concurrency)
    tasks: list[asyncio.Task[AgentResult]] = []

    async def _run(
        job_id: str,
        role: AgentRole,
        factory: Callable[[], Awaitable[AgentResult]],
    ) -> AgentResult:
        started = time.perf_counter()
        async with semaphore:
            try:
                result = await factory()
                if result.latency_ms <= 0:
                    result.latency_ms = int((time.perf_counter() - started) * 1000)
                return result
            except asyncio.CancelledError:
                return AgentResult(
                    task_id=job_id,
                    run_id="",
                    role=role,
                    success=False,
                    error="cancelled",
                    cancelled=True,
                    latency_ms=int((time.perf_counter() - started) * 1000),
                )

    for job_id, role, factory in jobs:
        tasks.append(asyncio.create_task(_run(job_id, role, factory), name=job_id))

    if cancel_remaining_on_failure:
        try:
            return await asyncio.gather(*tasks)
        except Exception:
            for task in tasks:
                if not task.done():
                    task.cancel()
            await asyncio.gather(*tasks, return_exceptions=True)
            raise

    gathered = await asyncio.gather(*tasks, return_exceptions=True)
    results: list[AgentResult] = []
    for item in gathered:
        if isinstance(item, AgentResult):
            results.append(item)
        elif isinstance(item, Exception):
            raise item
    return results
