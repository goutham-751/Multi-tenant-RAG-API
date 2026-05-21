"""
Pydantic schemas for document ingestion, query, and usage endpoints.

These are pure data-transfer objects — no database coupling.
"""

from typing import List, Optional

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Document schemas
# ---------------------------------------------------------------------------


class IngestResponse(BaseModel):
    """POST /api/v1/documents — response after successful ingestion."""

    message: str = "Document ingested successfully."
    doc_name: str
    chunks_ingested: int
    collection: str


class DocumentInfo(BaseModel):
    """Single document entry in the list response."""

    doc_name: str
    chunk_count: int


class DocumentListResponse(BaseModel):
    """GET /api/v1/documents — list all tenant documents."""

    tenant_id: str
    documents: List[DocumentInfo]
    total_chunks: int


class DocumentDeleteResponse(BaseModel):
    """DELETE /api/v1/documents/{doc_name} — confirmation."""

    message: str


# ---------------------------------------------------------------------------
# Query schemas
# ---------------------------------------------------------------------------


class QueryRequest(BaseModel):
    """POST /api/v1/query — request body."""

    question: str = Field(min_length=1, max_length=2000, description="Natural language question")


class SourceChunk(BaseModel):
    """A single source chunk returned with a query answer."""

    doc_name: str
    snippet: str
    chunk_index: int


class QueryResponse(BaseModel):
    """POST /api/v1/query — response body."""

    answer: str
    sources: List[SourceChunk]
    latency_ms: float
    cached: bool
    fallback: bool


# ---------------------------------------------------------------------------
# Usage schemas
# ---------------------------------------------------------------------------


class UsageResponse(BaseModel):
    """GET /api/v1/query/usage — tenant query statistics."""

    tenant_id: str
    queries_today: int
    cache_hit_rate: float
    avg_latency_ms: float


# ---------------------------------------------------------------------------
# Error schema
# ---------------------------------------------------------------------------


class ErrorResponse(BaseModel):
    """Standard error response — all errors follow this format."""

    error: str
    code: str
