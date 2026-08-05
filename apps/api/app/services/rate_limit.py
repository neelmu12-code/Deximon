import hashlib
import logging
from dataclasses import dataclass
from functools import lru_cache
from typing import Annotated, Protocol, cast

from fastapi import Depends
from redis import Redis
from redis.exceptions import RedisError

from app.core.config import Settings, get_settings

logger = logging.getLogger(__name__)

_FIXED_WINDOW_SCRIPT = """
local current = redis.call("INCR", KEYS[1])
if current == 1 then
    redis.call("EXPIRE", KEYS[1], ARGV[1])
end
local ttl = redis.call("TTL", KEYS[1])
return {current, ttl}
"""


@dataclass(frozen=True)
class RateLimitResult:
    allowed: bool
    limit: int
    remaining: int
    retry_after: int


class RateLimiter(Protocol):
    def hit(
        self,
        namespace: str,
        identifier: str,
        *,
        limit: int,
        window_seconds: int,
    ) -> RateLimitResult: ...


class RedisRateLimiter:
    def __init__(self, redis_url: str) -> None:
        self._client = Redis.from_url(
            redis_url,
            socket_connect_timeout=0.5,
            socket_timeout=0.5,
        )

    def hit(
        self,
        namespace: str,
        identifier: str,
        *,
        limit: int,
        window_seconds: int,
    ) -> RateLimitResult:
        identifier_hash = hashlib.sha256(identifier.encode("utf-8")).hexdigest()
        key = f"deximon:rate-limit:{namespace}:{identifier_hash}"

        try:
            raw_result = self._client.eval(
                _FIXED_WINDOW_SCRIPT,
                1,
                key,
                str(window_seconds),
            )
            result = cast(list[object], raw_result)
            current = _redis_int(result[0])
            ttl = max(_redis_int(result[1]), 1)
        except (IndexError, RedisError, TypeError, ValueError):
            # Nginx remains the outer rate-limit layer in production. A Redis
            # outage should not prevent legitimate users from registering.
            logger.warning("Rate limiter unavailable; allowing request", extra={"namespace": namespace})
            return RateLimitResult(
                allowed=True,
                limit=limit,
                remaining=limit,
                retry_after=0,
            )

        return RateLimitResult(
            allowed=current <= limit,
            limit=limit,
            remaining=max(limit - current, 0),
            retry_after=ttl,
        )


def _redis_int(value: object) -> int:
    if isinstance(value, bytes | int | str):
        return int(value)
    raise TypeError("Unexpected Redis rate-limit result")


@lru_cache
def _redis_rate_limiter(redis_url: str) -> RedisRateLimiter:
    return RedisRateLimiter(redis_url)


def get_rate_limiter(
    settings: Annotated[Settings, Depends(get_settings)],
) -> RateLimiter:
    return _redis_rate_limiter(settings.redis_url)
