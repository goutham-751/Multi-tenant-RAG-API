"""
Tenant data model (SQLModel table) and request/response schemas.

The Tenant table is the single source of truth for tenant identity,
API key verification, and usage tracking.
"""

from datetime import datetime, timezone
from typing import Optional
from uuid import uuid4

from sqlmodel import Field, SQLModel


# ---------------------------------------------------------------------------
# SQLModel table
# ---------------------------------------------------------------------------


class Tenant(SQLModel, table=True):
    __tablename__ = "tenants"

    """Persistent tenant record in SQLite."""

    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    user_id: str = Field(unique=True, index=True)  # Supabase auth.users.id
    name: str
    api_key_hash: Optional[str] = None  # bcrypt hash — generated on demand
    chroma_collection: str  # "tenant_{id_prefix}"
    queries_count: int = Field(default=0)
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ---------------------------------------------------------------------------
# Pydantic request/response schemas
# ---------------------------------------------------------------------------


class TenantRegisterRequest(SQLModel):
    """POST /api/v1/tenants/register — request body."""

    name: str = Field(min_length=1, max_length=128, description="Tenant display name")


class TenantRegisterResponse(SQLModel):
    """Returned once at registration — includes the plaintext API key."""

    tenant_id: str
    name: str
    api_key: str  # Only time the raw key is shown
    chroma_collection: str
    message: str = "Store your API key safely — it will not be shown again."


class TenantInfoResponse(SQLModel):
    """GET /api/v1/tenants/me — public tenant metadata."""

    tenant_id: str
    name: str
    chroma_collection: str
    queries_count: int
    is_active: bool
    created_at: datetime
