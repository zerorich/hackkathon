from __future__ import annotations

import asyncio
import json
import time
from typing import Any

import redis.asyncio as aioredis

from server.core.settings import Settings, get_settings


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

    async def decr(self, key: str) -> int:
        async with self._lock:
            item = self._store.get(key)
            if item is None:
                return 0
            value, expires = item
            count = max(0, int(value) - 1)
            if count == 0:
                self._store.pop(key, None)
            else:
                self._store[key] = (count, expires)
            return count

    async def acquire_slot(self, key: str, *, limit: int, ttl: int) -> bool:
        async with self._lock:
            item = self._store.get(key)
            now = time.time()
            current = 0
            if item is not None:
                value, expires = item
                if expires is None or expires > now:
                    current = int(value)
            if current >= limit:
                return False
            self._store[key] = (current + 1, now + ttl)
            return True

    async def acquire_generation_quota(
        self,
        active_key: str,
        daily_key: str,
        *,
        active_limit: int,
        daily_limit: int,
        active_ttl: int,
        daily_ttl: int,
    ) -> str:
        async with self._lock:
            now = time.time()

            def current(key: str) -> int:
                item = self._store.get(key)
                if item is None:
                    return 0
                value, expires = item
                return int(value) if expires is None or expires > now else 0

            active = current(active_key)
            daily = current(daily_key)
            if active >= active_limit:
                return "active"
            if daily >= daily_limit:
                return "daily"
            self._store[active_key] = (active + 1, now + active_ttl)
            self._store[daily_key] = (daily + 1, now + daily_ttl)
            return "acquired"

    async def rollback_generation_quota(self, active_key: str, daily_key: str) -> None:
        async with self._lock:
            for key in (active_key, daily_key):
                item = self._store.get(key)
                if item is None:
                    continue
                value, expires = item
                count = max(0, int(value) - 1)
                if count == 0:
                    self._store.pop(key, None)
                else:
                    self._store[key] = (count, expires)


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
            await self._redis.aclose()
            self._redis = None

    async def ping(self) -> bool:
        if not self._use_redis:
            return True
        if self._redis is None:
            return False
        return bool(await self._redis.ping())

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

    async def decr(self, key: str) -> int:
        if self._redis is not None:
            script = """
            local current = tonumber(redis.call('GET', KEYS[1]) or '0')
            if current <= 1 then
                redis.call('DEL', KEYS[1])
                return 0
            end
            return redis.call('DECR', KEYS[1])
            """
            return int(await self._redis.eval(script, 1, key))
        return await self._memory.decr(key)

    async def acquire_slot(self, key: str, *, limit: int, ttl: int) -> bool:
        if self._redis is not None:
            script = """
            local current = tonumber(redis.call('GET', KEYS[1]) or '0')
            if current >= tonumber(ARGV[1]) then return 0 end
            current = redis.call('INCR', KEYS[1])
            if current == 1 then redis.call('EXPIRE', KEYS[1], ARGV[2]) end
            return 1
            """
            result = await self._redis.eval(script, 1, key, limit, ttl)
            return bool(result)
        return await self._memory.acquire_slot(key, limit=limit, ttl=ttl)

    async def acquire_generation_quota(
        self,
        active_key: str,
        daily_key: str,
        *,
        active_limit: int,
        daily_limit: int,
        active_ttl: int = 3600,
        daily_ttl: int = 86400,
    ) -> str:
        if self._redis is not None:
            script = """
            local active = tonumber(redis.call('GET', KEYS[1]) or '0')
            local daily = tonumber(redis.call('GET', KEYS[2]) or '0')
            if active >= tonumber(ARGV[1]) then return 2 end
            if daily >= tonumber(ARGV[2]) then return 3 end
            active = redis.call('INCR', KEYS[1])
            daily = redis.call('INCR', KEYS[2])
            if active == 1 then redis.call('EXPIRE', KEYS[1], ARGV[3]) end
            if daily == 1 then redis.call('EXPIRE', KEYS[2], ARGV[4]) end
            return 1
            """
            result = int(
                await self._redis.eval(
                    script,
                    2,
                    active_key,
                    daily_key,
                    active_limit,
                    daily_limit,
                    active_ttl,
                    daily_ttl,
                )
            )
            return {1: "acquired", 2: "active", 3: "daily"}[result]
        return await self._memory.acquire_generation_quota(
            active_key,
            daily_key,
            active_limit=active_limit,
            daily_limit=daily_limit,
            active_ttl=active_ttl,
            daily_ttl=daily_ttl,
        )

    async def rollback_generation_quota(self, active_key: str, daily_key: str) -> None:
        if self._redis is not None:
            script = """
            for _, key in ipairs(KEYS) do
                local current = tonumber(redis.call('GET', key) or '0')
                if current <= 1 then redis.call('DEL', key)
                else redis.call('DECR', key) end
            end
            """
            await self._redis.eval(script, 2, active_key, daily_key)
            return
        await self._memory.rollback_generation_quota(active_key, daily_key)


_cache: CacheBackend | None = None


def get_cache() -> CacheBackend:
    global _cache
    if _cache is None:
        _cache = CacheBackend()
    return _cache


def reset_cache() -> None:
    global _cache
    _cache = None
