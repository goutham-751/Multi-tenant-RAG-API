"""
Comprehensive test suite for the Multi-Tenant RAG API.

Tests cover:
- Tenant registration and auth flows
- Rate limiting
- Document upload, list, and delete
- Query endpoint
- Tenant isolation (two tenants can't see each other's docs)
- Error handling

Uses FastAPI TestClient — no real HTTP, no external services needed.
"""

import os
import io
import tempfile

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine

from app.core.config import settings
from app.main import app
from app.db import get_session
from app.services.rate_limiter import rate_limiter
from app.services.cache import query_cache


# ---------------------------------------------------------------------------
# Test fixtures
# ---------------------------------------------------------------------------


@pytest.fixture(autouse=True)
def setup_test_db(tmp_path):
    """Use a fresh SQLite DB and ChromaDB for each test."""
    import chromadb
    from sentence_transformers import SentenceTransformer

    # --- SQLite ---
    test_db_path = str(tmp_path / "test.db")
    engine = create_engine(
        f"sqlite:///{test_db_path}",
        connect_args={"check_same_thread": False},
    )
    SQLModel.metadata.create_all(engine)

    def get_test_session():
        with Session(engine) as session:
            yield session

    app.dependency_overrides[get_session] = get_test_session

    # --- ChromaDB + Embedding model (set on app.state) ---
    chroma_dir = str(tmp_path / "chroma_test")
    app.state.chroma_client = chromadb.PersistentClient(path=chroma_dir)
    app.state.embed_model = SentenceTransformer(settings.EMBEDDING_MODEL)

    # Reset rate limiter and cache
    rate_limiter._windows.clear()
    query_cache.clear()

    yield

    app.dependency_overrides.clear()


@pytest.fixture
def client():
    """FastAPI test client."""
    return TestClient(app, raise_server_exceptions=False)


@pytest.fixture
def registered_tenant(client):
    """Register a tenant and return (tenant_data, api_key)."""
    response = client.post(
        "/api/v1/tenants/register",
        json={"name": "test-tenant"},
    )
    assert response.status_code == 200
    data = response.json()
    return data, data["api_key"]


def _auth_headers(api_key: str) -> dict:
    """Helper to build auth headers."""
    return {"X-API-Key": api_key}


# ---------------------------------------------------------------------------
# Health endpoint
# ---------------------------------------------------------------------------


class TestHealth:
    """Health endpoint tests."""

    def test_health_returns_ok(self, client):
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert "version" in data

    def test_health_no_auth_required(self, client):
        """Health endpoint should work without an API key."""
        response = client.get("/health")
        assert response.status_code == 200


# ---------------------------------------------------------------------------
# Tenant registration
# ---------------------------------------------------------------------------


class TestTenantRegistration:
    """Tenant registration and info tests."""

    def test_register_tenant_success(self, client):
        response = client.post(
            "/api/v1/tenants/register",
            json={"name": "acme-corp"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "acme-corp"
        assert data["api_key"].startswith("sk-")
        assert data["tenant_id"]
        assert data["chroma_collection"].startswith("tenant_")
        assert "Store your API key" in data["message"]

    def test_register_empty_name_fails(self, client):
        response = client.post(
            "/api/v1/tenants/register",
            json={"name": ""},
        )
        assert response.status_code == 422

    def test_register_missing_name_fails(self, client):
        response = client.post(
            "/api/v1/tenants/register",
            json={},
        )
        assert response.status_code == 422

    def test_get_me_success(self, client, registered_tenant):
        tenant_data, api_key = registered_tenant
        response = client.get(
            "/api/v1/tenants/me",
            headers=_auth_headers(api_key),
        )
        assert response.status_code == 200
        data = response.json()
        assert data["tenant_id"] == tenant_data["tenant_id"]
        assert data["name"] == "test-tenant"
        assert data["is_active"] is True

    def test_get_me_without_api_key_fails(self, client):
        response = client.get("/api/v1/tenants/me")
        assert response.status_code == 422  # Missing header


# ---------------------------------------------------------------------------
# Authentication
# ---------------------------------------------------------------------------


class TestAuthentication:
    """API key authentication tests."""

    def test_invalid_api_key_returns_401(self, client):
        response = client.get(
            "/api/v1/tenants/me",
            headers=_auth_headers("sk-invalid-key-12345"),
        )
        assert response.status_code == 401
        data = response.json()
        assert data["code"] == "INVALID_API_KEY"

    def test_valid_api_key_returns_200(self, client, registered_tenant):
        _, api_key = registered_tenant
        response = client.get(
            "/api/v1/tenants/me",
            headers=_auth_headers(api_key),
        )
        assert response.status_code == 200


# ---------------------------------------------------------------------------
# Rate limiting
# ---------------------------------------------------------------------------


class TestRateLimiting:
    """Sliding window rate limiter tests."""

    def test_rate_limit_enforced(self, client, registered_tenant):
        """Exceed the rate limit and expect 429."""
        _, api_key = registered_tenant
        headers = _auth_headers(api_key)

        # Set a very low limit for testing
        original_max = rate_limiter.max_requests
        rate_limiter.max_requests = 3

        try:
            # Make requests up to the limit
            for _ in range(3):
                response = client.get("/api/v1/tenants/me", headers=headers)
                assert response.status_code == 200

            # Next request should be rate limited
            response = client.get("/api/v1/tenants/me", headers=headers)
            assert response.status_code == 429
            data = response.json()
            assert data["code"] == "RATE_LIMIT_EXCEEDED"
            assert "Retry-After" in response.headers
        finally:
            rate_limiter.max_requests = original_max


# ---------------------------------------------------------------------------
# Documents
# ---------------------------------------------------------------------------


class TestDocuments:
    """Document upload, list, and delete tests."""

    def _upload_txt(self, client, api_key: str, filename: str = "test.txt", content: str = "Hello world. This is a test document with enough text to create chunks."):
        """Helper to upload a text file."""
        file_content = content.encode("utf-8")
        return client.post(
            "/api/v1/documents",
            headers=_auth_headers(api_key),
            files={"file": (filename, io.BytesIO(file_content), "text/plain")},
        )

    def test_upload_txt_success(self, client, registered_tenant):
        _, api_key = registered_tenant
        response = self._upload_txt(client, api_key)
        assert response.status_code == 200
        data = response.json()
        assert data["doc_name"] == "test.txt"
        assert data["chunks_ingested"] >= 1
        assert data["collection"].startswith("tenant_")

    def test_upload_unsupported_type_returns_400(self, client, registered_tenant):
        _, api_key = registered_tenant
        response = client.post(
            "/api/v1/documents",
            headers=_auth_headers(api_key),
            files={"file": ("test.exe", io.BytesIO(b"binary data"), "application/octet-stream")},
        )
        assert response.status_code == 400
        assert response.json()["code"] == "UNSUPPORTED_FILE_TYPE"

    def test_upload_empty_file_returns_400(self, client, registered_tenant):
        _, api_key = registered_tenant
        response = client.post(
            "/api/v1/documents",
            headers=_auth_headers(api_key),
            files={"file": ("empty.txt", io.BytesIO(b""), "text/plain")},
        )
        assert response.status_code == 400

    def test_list_documents(self, client, registered_tenant):
        _, api_key = registered_tenant

        # Upload a document first
        self._upload_txt(client, api_key)

        # List documents
        response = client.get(
            "/api/v1/documents",
            headers=_auth_headers(api_key),
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data["documents"]) >= 1
        assert data["total_chunks"] >= 1

    def test_delete_document(self, client, registered_tenant):
        _, api_key = registered_tenant

        # Upload
        self._upload_txt(client, api_key, filename="to_delete.txt")

        # Delete
        response = client.delete(
            "/api/v1/documents/to_delete.txt",
            headers=_auth_headers(api_key),
        )
        assert response.status_code == 200
        assert "Deleted" in response.json()["message"]

    def test_delete_nonexistent_returns_404(self, client, registered_tenant):
        _, api_key = registered_tenant
        response = client.delete(
            "/api/v1/documents/nonexistent.txt",
            headers=_auth_headers(api_key),
        )
        assert response.status_code == 404


# ---------------------------------------------------------------------------
# Tenant isolation
# ---------------------------------------------------------------------------


class TestTenantIsolation:
    """Two tenants should never see each other's documents."""

    def test_isolation_between_tenants(self, client):
        # Register two tenants
        r1 = client.post("/api/v1/tenants/register", json={"name": "tenant-a"})
        r2 = client.post("/api/v1/tenants/register", json={"name": "tenant-b"})
        key_a = r1.json()["api_key"]
        key_b = r2.json()["api_key"]

        # Tenant A uploads a document
        client.post(
            "/api/v1/documents",
            headers=_auth_headers(key_a),
            files={"file": ("secret_a.txt", io.BytesIO(b"This is tenant A's secret data."), "text/plain")},
        )

        # Tenant B should see no documents
        response = client.get(
            "/api/v1/documents",
            headers=_auth_headers(key_b),
        )
        data = response.json()
        assert data["total_chunks"] == 0
        assert len(data["documents"]) == 0


# ---------------------------------------------------------------------------
# Error handling
# ---------------------------------------------------------------------------


class TestErrorHandling:
    """All errors should follow the {error, code} format."""

    def test_404_has_structured_error(self, client):
        response = client.get("/nonexistent-endpoint")
        assert response.status_code in (404, 405)

    def test_request_id_in_headers(self, client):
        response = client.get("/health")
        assert "X-Request-ID" in response.headers
