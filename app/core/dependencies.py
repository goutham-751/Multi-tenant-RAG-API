"""
FastAPI dependencies — auth and rate limiting.
"""

import jwt
from typing import Optional
from fastapi import Depends, Header, HTTPException, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlmodel import Session

from app.core.config import settings
from app.db import get_session
from app.models.tenant import Tenant
from app.services.rate_limiter import rate_limiter
from app.services.tenant_service import (
    get_tenant_by_api_key,
    get_tenant_by_user_id,
    create_tenant_for_user,
)

security = HTTPBearer(auto_error=False)


def _check_tenant_active_and_rate_limit(tenant: Tenant) -> None:
    if not tenant.is_active:
        raise HTTPException(
            status_code=403,
            detail={"error": "Tenant account is deactivated.", "code": "TENANT_INACTIVE"},
        )
    try:
        rate_limiter.check(tenant.id)
    except ValueError as e:
        retry_after = str(e)
        raise HTTPException(
            status_code=429,
            detail={"error": "Rate limit exceeded.", "code": "RATE_LIMIT_EXCEEDED"},
            headers={"Retry-After": retry_after},
        )


async def get_current_tenant(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    session: Session = Depends(get_session),
) -> Tenant:
    """
    Authenticate and authorize the current tenant via JWT.
    Used for dashboard access.
    """
    if not credentials:
        raise HTTPException(
            status_code=401,
            detail={"error": "Missing authorization token.", "code": "MISSING_TOKEN"},
        )
    
    token = credentials.credentials
    try:
        # Decode JWT using Supabase JWT secret
        payload = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated"
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
        
    user_id = payload.get("sub")
    email = payload.get("email", "unknown_user")

    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    # Look up tenant by user_id
    tenant = get_tenant_by_user_id(user_id, session)
    if not tenant:
        # Auto-create for first-time login
        tenant = create_tenant_for_user(user_id, email, session)

    _check_tenant_active_and_rate_limit(tenant)
    return tenant


async def get_tenant_from_api_key(
    request: Request,
    x_api_key: Optional[str] = Header(None, description="Tenant API key (sk-...)"),
    session: Session = Depends(get_session),
) -> Tenant:
    """
    Authenticate and authorize the tenant via X-API-Key.
    Used for external API access.
    """
    if not x_api_key:
        raise HTTPException(
            status_code=401,
            detail={"error": "Missing API key.", "code": "MISSING_API_KEY"},
        )
        
    tenant = get_tenant_by_api_key(x_api_key, session)
    if tenant is None:
        raise HTTPException(
            status_code=401,
            detail={"error": "Invalid API key.", "code": "INVALID_API_KEY"},
        )

    _check_tenant_active_and_rate_limit(tenant)
    return tenant


async def get_tenant_any(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    x_api_key: Optional[str] = Header(None, description="Tenant API key (sk-...)"),
    session: Session = Depends(get_session),
) -> Tenant:
    """
    Accept either JWT or API Key authentication.
    """
    if credentials:
        return await get_current_tenant(request, credentials, session)
    elif x_api_key:
        return await get_tenant_from_api_key(request, x_api_key, session)
    else:
        raise HTTPException(
            status_code=401,
            detail={"error": "Authentication required (JWT or API Key).", "code": "UNAUTHORIZED"},
        )
