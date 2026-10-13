"""Redis client — cache, rate limiting, token blacklisting."""
import hashlib
import json
import logging
from typing import Any

import redis.asyncio as aioredis

from app.core.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)

_redis: aioredis.Redis | None = None


def get_redis() -> aioredis.Redis | None:
    return _redis


async def connect_redis() -> None:
    global _redis
    if not settings.redis_enabled:
        return
    try:
        client = aioredis.from_url(settings.redis_url, decode_responses=True)
        await client.ping()
        _redis = client
        logger.info("Redis connected at %s", settings.redis_url)
    except Exception as exc:
        logger.warning("Redis unavailable — caching/rate-limiting disabled: %s", exc)
        _redis = None


async def close_redis() -> None:
    global _redis
    if _redis:
        await _redis.aclose()
        _redis = None


# ── Cache helpers ────────────────────────────────────────────────────────────

def _cache_key(prefix: str, value: str) -> str:
    digest = hashlib.sha256(value.encode()).hexdigest()[:24]
    return f"{prefix}:{digest}"


async def cache_get(prefix: str, key: str) -> Any | None:
    if not _redis:
        return None
    try:
        raw = await _redis.get(_cache_key(prefix, key))
        return json.loads(raw) if raw else None
    except Exception:
        return None


async def cache_set(prefix: str, key: str, value: Any, ttl: int | None = None) -> None:
    if not _redis:
        return
    try:
        await _redis.setex(
            _cache_key(prefix, key),
            ttl or settings.cache_ttl_seconds,
            json.dumps(value),
        )
    except Exception:
        pass


# ── Rate limiting ────────────────────────────────────────────────────────────

async def is_rate_limited(user_id: str) -> bool:
    if not _redis:
        return False
    try:
        key = f"rate:{user_id}"
        count = await _redis.incr(key)
        if count == 1:
            await _redis.expire(key, settings.rate_limit_window_seconds)
        return int(count) > settings.rate_limit_requests
    except Exception:
        return False


# ── Token blacklisting ───────────────────────────────────────────────────────

async def blacklist_token(token: str, ttl_seconds: int) -> None:
    if not _redis:
        return
    try:
        await _redis.setex(f"blacklist:{token}", ttl_seconds, "1")
    except Exception:
        pass


async def is_token_blacklisted(token: str) -> bool:
    if not _redis:
        return False
    try:
        return bool(await _redis.exists(f"blacklist:{token}"))
    except Exception:
        return False
