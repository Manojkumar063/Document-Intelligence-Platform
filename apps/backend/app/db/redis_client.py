"""Redis client — cache, rate limiting, token blacklisting."""
import hashlib
import json
import logging
from typing import Any

import redis.asyncio as aioredis

from app.core.config import get_settings
from app.utils.exceptions import AppError

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
        logger.info("Redis connected")
    except Exception as exc:
        logger.warning("Redis unavailable; authentication protections will fail closed: %s", exc)
        _redis = None


async def close_redis() -> None:
    global _redis
    if _redis:
        await _redis.aclose()
        _redis = None


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


async def is_rate_limited(user_id: str) -> bool:
    """Existing per-user limiter; cache failures do not affect this non-auth helper."""
    if not _redis:
        return False
    try:
        key = _cache_key("rate", user_id)
        count = await _redis.incr(key)
        if count == 1:
            await _redis.expire(key, settings.rate_limit_window_seconds)
        return int(count) > settings.rate_limit_requests
    except Exception:
        return False


async def check_auth_rate_limit(identifier: str) -> bool:
    """Count authentication attempts; return True once the configured limit is exceeded.

    Redis can be disabled explicitly for local development. If it is enabled but
    unavailable, fail closed rather than silently disabling brute-force protection.
    """
    if not settings.redis_enabled:
        return False
    if _redis is None:
        raise AppError(
            message="Authentication protection is temporarily unavailable",
            code="AUTH_PROTECTION_UNAVAILABLE",
            status_code=503,
        )
    try:
        key = _cache_key("auth-rate", identifier)
        count = await _redis.incr(key)
        if count == 1:
            await _redis.expire(key, settings.auth_rate_limit_window_seconds)
        return int(count) > settings.auth_rate_limit_requests
    except Exception as exc:
        logger.warning("Authentication rate limiter unavailable: %s", exc)
        raise AppError(
            message="Authentication protection is temporarily unavailable",
            code="AUTH_PROTECTION_UNAVAILABLE",
            status_code=503,
        ) from exc


def _blacklist_key(token: str) -> str:
    return f"blacklist:{hashlib.sha256(token.encode()).hexdigest()}"


async def blacklist_token(token: str, ttl_seconds: int) -> None:
    if not settings.redis_enabled:
        return
    if _redis is None:
        raise AppError(
            message="Session revocation is temporarily unavailable",
            code="SESSION_REVOCATION_UNAVAILABLE",
            status_code=503,
        )
    try:
        await _redis.setex(_blacklist_key(token), max(ttl_seconds, 1), "1")
    except Exception as exc:
        logger.warning("Could not revoke session: %s", exc)
        raise AppError(
            message="Session revocation is temporarily unavailable",
            code="SESSION_REVOCATION_UNAVAILABLE",
            status_code=503,
        ) from exc


async def is_token_blacklisted(token: str) -> bool:
    if not settings.redis_enabled:
        return False
    if _redis is None:
        raise AppError(
            message="Session validation is temporarily unavailable",
            code="SESSION_VALIDATION_UNAVAILABLE",
            status_code=503,
        )
    try:
        return bool(await _redis.exists(_blacklist_key(token)))
    except Exception as exc:
        logger.warning("Could not validate session revocation state: %s", exc)
        raise AppError(
            message="Session validation is temporarily unavailable",
            code="SESSION_VALIDATION_UNAVAILABLE",
            status_code=503,
        ) from exc
