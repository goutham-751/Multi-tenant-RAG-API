"""
Query router — RAG query and usage stats.

POST /api/v1/query       — ask a question against uploaded documents
GET  /api/v1/query/usage — get query statistics for the current tenant
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlmodel import Session

from app.core.dependencies import get_current_tenant
from app.db import get_session
from app.models.schemas import (
    QueryRequest,
    QueryResponse,
    SourceChunk,
    UsageResponse,
)
from app.models.tenant import Tenant
from app.services.cache import query_cache
from app.services.rag_service import generate_answer
from app.services.tenant_service import increment_queries

router = APIRouter(prefix="/api/v1/query", tags=["Query"])


@router.post(
    "",
    response_model=QueryResponse,
    summary="Query documents",
    description="Ask a natural language question against your uploaded documents using RAG.",
)
async def query_documents(
    body: QueryRequest,
    request: Request,
    response: Response,
    current_tenant: Tenant = Depends(get_current_tenant),
    session: Session = Depends(get_session),
):
    """
    Full RAG query pipeline:
    1. Check cache (tenant-scoped SHA256 key)
    2. On miss: hybrid retrieval → LLM generation
    3. Cache result (if not fallback)
    4. Increment query counter
    5. Return answer with sources, latency, cache/fallback flags
    """
    request_id = str(uuid.uuid4())
    response.headers["X-Request-ID"] = request_id

    # 1. Cache check
    cached_result = query_cache.get(current_tenant.id, body.question)
    if cached_result is not None:
        response.headers["X-Cache"] = "HIT"
        return QueryResponse(**cached_result)

    response.headers["X-Cache"] = "MISS"

    # 2. Generate answer via RAG pipeline
    chroma_client = request.app.state.chroma_client
    embed_model = request.app.state.embed_model

    result = generate_answer(
        question=body.question,
        collection_name=current_tenant.chroma_collection,
        chroma_client=chroma_client,
        embed_model=embed_model,
    )

    # 3. Cache result (skip if fallback)
    if not result["fallback"]:
        query_cache.set(current_tenant.id, body.question, result)

    # 4. Record latency for usage stats
    query_cache.record_latency(result["latency_ms"])

    # 5. Increment tenant query counter
    increment_queries(current_tenant, session)

    return QueryResponse(
        answer=result["answer"],
        sources=[SourceChunk(**s) for s in result["sources"]],
        latency_ms=result["latency_ms"],
        cached=False,
        fallback=result["fallback"],
    )


@router.get(
    "/usage",
    response_model=UsageResponse,
    summary="Query usage stats",
    description="Returns query statistics for the authenticated tenant.",
)
async def query_usage(
    current_tenant: Tenant = Depends(get_current_tenant),
):
    """Return cache hit rate, average latency, and total queries."""
    return UsageResponse(
        tenant_id=current_tenant.id,
        queries_today=current_tenant.queries_count,
        cache_hit_rate=query_cache.hit_rate,
        avg_latency_ms=query_cache.avg_latency_ms,
    )
