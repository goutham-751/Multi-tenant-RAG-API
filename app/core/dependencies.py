"""
FastAPI dependencies — auth and rate limiting.

The get_current_tenant dependency is the single auth entry point.
It's injected via Depends() into every protected route. It:
  1. Extracts the X-API-Key header
  2. Verifies the key against stored bcrypt hashes
  3. Checks the tenant is active
  4. Checks the sliding window rate limit
  5. Returns the Tenant model (or raises HTTP errors)
"""

from fastapi import Depends, Header, HTTPException, Request
from sqlmodel import Session

from app.db import get_session
from app.models.tenant import Tenant
from app.services.rate_limiter import rate_limiter
from app.services.tenant_service import get_tenant_by_api_key


async def get_current_tenant(
    request: Request,
    x_api_key: str = Header(..., description="Tenant API key (sk-...)"),
    session: Session = Depends(get_session),
) -> Tenant:
    """
    Authenticate and authorize the current tenant.

    This dependency is the gatekeeper for all protected endpoints.
    Raises 401, 403, or 429 as appropriate.
    """
    # 1. Look up tenant by API key
    tenant = get_tenant_by_api_key(x_api_key, session)
    if tenant is None:
        raise HTTPException(
            status_code=401,
            detail={"error": "Invalid API key.", "code": "INVALID_API_KEY"},
        )

    # 2. Check tenant is active
    if not tenant.is_active:
        raise HTTPException(
            status_code=403,
            detail={"error": "Tenant account is deactivated.", "code": "TENANT_INACTIVE"},
        )

    # 3. Rate limit check
    try:
        rate_limiter.check(tenant.id)
    except ValueError as e:
        retry_after = str(e)
        raise HTTPException(
            status_code=429,
            detail={"error": "Rate limit exceeded.", "code": "RATE_LIMIT_EXCEEDED"},
            headers={"Retry-After": retry_after},
        )

    return tenant
