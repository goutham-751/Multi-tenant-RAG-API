"""
In-memory query cache with TTL and tenant-scoped keys.

Cache key: SHA256(tenant_id + question) — ensures tenant isolation.
Responses are stored as dicts with expiry timestamps.
Tracks hit/miss stats for the /query/usage endpoint.
"""

import time
from typing import Any, Optional

from app.core.config import settings
from app.core.security import cache_key_hash


class QueryCache:
    """TTL-based in-memory cache with tenant isolation and usage stats."""

    def __init__(self, ttl_seconds: int | None = None):
        self.ttl = ttl_seconds or settings.CACHE_TTL_SECONDS
        self._store: dict[str, dict[str, Any]] = {}
        self._hits: int = 0
        self._misses: int = 0
        self._latencies: list[float] = []

    def get(self, tenant_id: str, question: str) -> Optional[dict]:
        """
        Retrieve a cached response.

        Returns None on miss or expiry. Increments hit/miss counters.
        """
        key = cache_key_hash(tenant_id, question)
        entry = self._store.get(key)

        if entry is None:
            self._misses += 1
            return None

        if time.time() > entry["expires_at"]:
            # Expired — remove and count as miss
            del self._store[key]
            self._misses += 1
            return None

        self._hits += 1
        return entry["data"]

    def set(self, tenant_id: str, question: str, response: dict) -> None:
        """Store a response in cache with TTL."""
        key = cache_key_hash(tenant_id, question)
        self._store[key] = {
            "data": response,
            "expires_at": time.time() + self.ttl,
        }

    def record_latency(self, latency_ms: float) -> None:
        """Record a query latency for usage stats."""
        self._latencies.append(latency_ms)

    @property
    def hit_rate(self) -> float:
        """Cache hit rate as a float between 0 and 1."""
        total = self._hits + self._misses
        if total == 0:
            return 0.0
        return round(self._hits / total, 4)

    @property
    def avg_latency_ms(self) -> float:
        """Average query latency in milliseconds."""
        if not self._latencies:
            return 0.0
        return round(sum(self._latencies) / len(self._latencies), 2)

    @property
    def total_queries(self) -> int:
        """Total number of cache lookups (hits + misses)."""
        return self._hits + self._misses

    def clear(self) -> None:
        """Reset all cache state (used in tests)."""
        self._store.clear()
        self._hits = 0
        self._misses = 0
        self._latencies.clear()


# Singleton — shared across the application
query_cache = QueryCache()
