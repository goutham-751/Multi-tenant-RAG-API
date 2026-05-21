"""
Sliding window rate limiter — per-tenant request throttling.

Uses an in-memory deque of timestamps per tenant. On each check,
old timestamps are pruned, and the current count is compared against
the configured limit. Thread-safe for single-process deployment.
"""

import time
from collections import defaultdict, deque

from app.core.config import settings


class RateLimiter:
    """Sliding window rate limiter scoped by tenant ID."""

    def __init__(
        self,
        max_requests: int | None = None,
        window_seconds: int | None = None,
    ):
        self.max_requests = max_requests or settings.RATE_LIMIT_REQUESTS
        self.window_seconds = window_seconds or settings.RATE_LIMIT_WINDOW_SECONDS
        # tenant_id → deque of timestamps
        self._windows: dict[str, deque] = defaultdict(deque)

    def check(self, tenant_id: str) -> None:
        """
        Check rate limit for a tenant.

        Raises ValueError with retry_after if the limit is exceeded.
        The caller (dependency layer) converts this to a 429 response.
        """
        now = time.time()
        window = self._windows[tenant_id]

        # Prune timestamps outside the sliding window
        cutoff = now - self.window_seconds
        while window and window[0] < cutoff:
            window.popleft()

        if len(window) >= self.max_requests:
            # Calculate retry-after from the oldest request in the window
            retry_after = int(window[0] + self.window_seconds - now) + 1
            raise ValueError(str(max(1, retry_after)))

        # Record this request
        window.append(now)

    def reset(self, tenant_id: str) -> None:
        """Clear rate limit state for a tenant (used in tests)."""
        self._windows.pop(tenant_id, None)


# Singleton — shared across the application
rate_limiter = RateLimiter()
