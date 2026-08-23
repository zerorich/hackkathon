from __future__ import annotations

import asyncio
import json
import time
from typing import Any

import redis.asyncio as aioredis

from app.core.settings import Settings, get_settings


class MemoryCache:
    def __init__(self) -> None:
        self._store: dict[str, tuple[Any, float | None]] = {}
        self._lock = asyncio.Lock()

    async def get(self, key: str) -> Any | None:
        async with self._lock:
            item = self._store.get(key)
            if item is None:
                return None
            value, expires = item
            if expires is not None and time.time() > expires:
                del self._store[key]
                return None
            return value

    async def set(self, key: str, value: Any, *, ttl: int | None = None) -> None:
        async with self._lock:
            expires = time.time() + ttl if ttl else None
            self._store[key] = (value, expires)

    async def delete(self, key: str) -> None:
        async with self._lock:
            self._store.pop(key, None)

    async def incr(self, key: str, *, ttl: int | None = None) -> int:
        async with self._lock:
            item = self._store.get(key)
            if item is None:
                count = 1
            else:
                value, expires = item
                count = int(value) + 1
                if expires is not None and time.time() > expires:
                    count = 1
            expires = time.time() + ttl if ttl else None
            self._store[key] = (count, expires)
            return count


class CacheBackend:
    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()
        self._redis: aioredis.Redis | None = None
        self._memory = MemoryCache()
        self._use_redis = bool(self.settings.redis_url)

    async def connect(self) -> None:
        if self._use_redis and self._redis is None:
            self._redis = aioredis.from_url(
                self.settings.redis_url,  # type: ignore[arg-type]
                decode_responses=True,
            )

    async def close(self) -> None:
        if self._redis is not None:
            await self._redis.close()
            self._redis = None

    async def get(self, key: str) -> Any | None:
        if self._redis is not None:
            raw = await self._redis.get(key)
            return json.loads(raw) if raw else None
        return await self._memory.get(key)

    async def set(self, key: str, value: Any, *, ttl: int | None = None) -> None:
        if self._redis is not None:
            payload = json.dumps(value)
            if ttl:
                await self._redis.setex(key, ttl, payload)
            else:
                await self._redis.set(key, payload)
            return
        await self._memory.set(key, value, ttl=ttl)

    async def delete(self, key: str) -> None:
        if self._redis is not None:
            await self._redis.delete(key)
            return
        await self._memory.delete(key)

    async def incr(self, key: str, *, ttl: int | None = None) -> int:
        if self._redis is not None:
            count = await self._redis.incr(key)
            if ttl and count == 1:
                await self._redis.expire(key, ttl)
            return int(count)
        return await self._memory.incr(key, ttl=ttl)


_cache: CacheBackend | None = None


def get_cache() -> CacheBackend:
    global _cache
    if _cache is None:
        _cache = CacheBackend()
    return _cache


def reset_cache() -> None:
    global _cache
    _cache = None
