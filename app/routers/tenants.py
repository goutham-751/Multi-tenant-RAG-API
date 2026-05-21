"""
Tenant router — registration and tenant info.

POST /api/v1/tenants/register — public, no auth required
GET  /api/v1/tenants/me       — authenticated, returns tenant metadata
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from app.core.dependencies import get_current_tenant
from app.db import get_session
from app.models.tenant import (
    Tenant,
    TenantInfoResponse,
    TenantRegisterRequest,
    TenantRegisterResponse,
)
from app.services.tenant_service import create_tenant

router = APIRouter(prefix="/api/v1/tenants", tags=["Tenants"])


@router.post(
    "/register",
    response_model=TenantRegisterResponse,
    summary="Register a new tenant",
    description="Register a new tenant and receive a one-time API key.",
)
async def register_tenant(
    body: TenantRegisterRequest,
    session: Session = Depends(get_session),
):
    """Create a new tenant, return the API key (shown only once)."""
    tenant, plain_key = create_tenant(name=body.name, session=session)

    return TenantRegisterResponse(
        tenant_id=tenant.id,
        name=tenant.name,
        api_key=plain_key,
        chroma_collection=tenant.chroma_collection,
    )


@router.get(
    "/me",
    response_model=TenantInfoResponse,
    summary="Get current tenant info",
    description="Returns metadata for the authenticated tenant.",
)
async def get_me(
    current_tenant: Tenant = Depends(get_current_tenant),
):
    """Return the authenticated tenant's metadata."""
    return TenantInfoResponse(
        tenant_id=current_tenant.id,
        name=current_tenant.name,
        chroma_collection=current_tenant.chroma_collection,
        queries_count=current_tenant.queries_count,
        is_active=current_tenant.is_active,
        created_at=current_tenant.created_at,
    )
