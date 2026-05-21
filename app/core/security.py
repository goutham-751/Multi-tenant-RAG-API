"""
Security utilities — API key generation, hashing, and verification.

API keys use 256 bits of entropy via secrets.token_urlsafe(32).
Keys are stored as bcrypt hashes (cost factor 12) — irreversible.
Verification uses constant-time bcrypt comparison.
"""

import hashlib
import secrets

import bcrypt


def generate_api_key() -> str:
    """Generate a new API key with sk- prefix and 256 bits of entropy."""
    return f"sk-{secrets.token_urlsafe(32)}"


def hash_api_key(api_key: str) -> str:
    """Hash an API key with bcrypt (cost factor 12). Returns string."""
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(api_key.encode("utf-8"), salt)
    return hashed.decode("utf-8")


def verify_api_key(plain_key: str, hashed_key: str) -> bool:
    """Constant-time bcrypt comparison — safe against timing attacks."""
    try:
        return bcrypt.checkpw(plain_key.encode("utf-8"), hashed_key.encode("utf-8"))
    except Exception:
        return False


def cache_key_hash(tenant_id: str, question: str) -> str:
    """SHA256 hash of tenant_id + question for cache key isolation."""
    raw = f"{tenant_id}:{question}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()
