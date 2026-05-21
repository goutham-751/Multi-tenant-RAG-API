"""
Tenant service — create, lookup, and update tenant records.

All database operations for the Tenant model are centralized here.
Routers call these functions — they never touch the session directly.
"""

from sqlmodel import Session, select

from app.core.security import generate_api_key, hash_api_key, verify_api_key
from app.models.tenant import Tenant


def create_tenant(name: str, session: Session) -> tuple[Tenant, str]:
    """
    Register a new tenant.

    Returns (Tenant, plain_api_key). The plain key is returned only once
    and must be shown to the user immediately — it's never stored.
    """
    plain_key = generate_api_key()
    hashed_key = hash_api_key(plain_key)

    tenant = Tenant(
        name=name,
        api_key_hash=hashed_key,
        chroma_collection=f"tenant_{name.lower().replace(' ', '_').replace('-', '_')}_{Tenant.__name__}",
    )
    # Use a shorter, cleaner collection name based on the tenant ID prefix
    tenant.chroma_collection = f"tenant_{tenant.id[:8]}"

    session.add(tenant)
    session.commit()
    session.refresh(tenant)

    return tenant, plain_key


def get_tenant_by_api_key(api_key: str, session: Session) -> Tenant | None:
    """
    Look up a tenant by verifying the provided API key against all stored hashes.

    Uses bcrypt constant-time comparison. Returns None if no match found.
    """
    statement = select(Tenant)
    tenants = session.exec(statement).all()

    for tenant in tenants:
        if verify_api_key(api_key, tenant.api_key_hash):
            return tenant

    return None


def get_tenant_by_id(tenant_id: str, session: Session) -> Tenant | None:
    """Look up a tenant by ID."""
    return session.get(Tenant, tenant_id)


def increment_queries(tenant: Tenant, session: Session) -> None:
    """Increment the lifetime query counter for a tenant."""
    tenant.queries_count += 1
    session.add(tenant)
    session.commit()
    session.refresh(tenant)
