"""
Tenant router — registration and tenant info.

GET  /api/v1/tenants/me         — authenticated (JWT), returns tenant metadata
POST /api/v1/tenants/me/api-key — authenticated (JWT), generates a developer API key
"""

from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.core.dependencies import get_current_tenant
from app.db import get_session
from app.models.tenant import (
    Tenant,
    TenantInfoResponse,
)
from app.services.tenant_service import generate_api_key_for_tenant
from pydantic import BaseModel

class NewAPIKeyResponse(BaseModel):
    api_key: str
    message: str = "Store your API key safely — it will not be shown again."

router = APIRouter(prefix="/api/v1/tenants", tags=["Tenants"])


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
        tenant_id=str(current_tenant.id),
        name=current_tenant.name,
        chroma_collection=current_tenant.chroma_collection,
        queries_count=current_tenant.queries_count,
        is_active=current_tenant.is_active,
        created_at=current_tenant.created_at,
    )


@router.post(
    "/me/api-key",
    response_model=NewAPIKeyResponse,
    summary="Generate a developer API key",
    description="Generates a new API key for external tool usage. Invalidates any old key.",
)
async def generate_api_key(
    current_tenant: Tenant = Depends(get_current_tenant),
    session: Session = Depends(get_session),
):
    """Generate and return a new API key."""
    plain_key = generate_api_key_for_tenant(current_tenant, session)
    return NewAPIKeyResponse(api_key=plain_key)


@router.get(
    "/all",
    response_model=list[TenantInfoResponse],
    summary="Get all tenants (Superadmin only)",
)
async def get_all_tenants_endpoint(
    current_tenant: Tenant = Depends(get_current_tenant),
    session: Session = Depends(get_session),
):
    from fastapi import HTTPException
    if current_tenant.name != "superadmin@email.com":
        raise HTTPException(status_code=403, detail="Superadmin access required")
    from app.services.tenant_service import get_all_tenants
    tenants = get_all_tenants(session)
    return [
        TenantInfoResponse(
            tenant_id=str(t.id),
            name=t.name,
            chroma_collection=t.chroma_collection,
            queries_count=t.queries_count,
            is_active=t.is_active,
            created_at=t.created_at,
        )
        for t in tenants
    ]
