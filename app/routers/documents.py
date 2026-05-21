"""
Documents router — upload, list, and delete documents.

POST   /api/v1/documents           — upload and ingest a document
GET    /api/v1/documents           — list all tenant documents
DELETE /api/v1/documents/{doc_name} — delete a document and its vectors
"""

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile

from app.core.dependencies import get_current_tenant
from app.models.schemas import (
    DocumentDeleteResponse,
    DocumentInfo,
    DocumentListResponse,
    IngestResponse,
)
from app.models.tenant import Tenant
from app.services import vector_service

router = APIRouter(prefix="/api/v1/documents", tags=["Documents"])

# Max file size: 10 MB
MAX_FILE_SIZE = 10 * 1024 * 1024


@router.post(
    "",
    response_model=IngestResponse,
    summary="Upload a document",
    description="Upload a .pdf, .txt, or .md file (max 10MB) for ingestion into the RAG pipeline.",
)
async def upload_document(
    request: Request,
    file: UploadFile = File(..., description="Document file (.pdf, .txt, .md)"),
    current_tenant: Tenant = Depends(get_current_tenant),
):
    """Ingest a document: validate → load → chunk → embed → upsert to ChromaDB."""
    # Validate filename
    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail={"error": "No filename provided.", "code": "MISSING_FILENAME"},
        )

    # Read file content
    content = await file.read()

    # Validate file size
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail={"error": "File exceeds 10MB limit.", "code": "FILE_TOO_LARGE"},
        )

    if len(content) == 0:
        raise HTTPException(
            status_code=400,
            detail={"error": "File is empty.", "code": "EMPTY_FILE"},
        )

    # Get shared resources from app state
    chroma_client = request.app.state.chroma_client
    embed_model = request.app.state.embed_model

    try:
        chunks_ingested = vector_service.ingest_document(
            file_bytes=content,
            filename=file.filename,
            collection_name=current_tenant.chroma_collection,
            chroma_client=chroma_client,
            embed_model=embed_model,
        )
    except ValueError as e:
        error_msg = str(e)
        if "Unsupported file type" in error_msg:
            raise HTTPException(
                status_code=400,
                detail={"error": error_msg, "code": "UNSUPPORTED_FILE_TYPE"},
            )
        elif "No extractable text" in error_msg:
            raise HTTPException(
                status_code=422,
                detail={"error": error_msg, "code": "NO_EXTRACTABLE_TEXT"},
            )
        else:
            raise HTTPException(
                status_code=400,
                detail={"error": error_msg, "code": "INGESTION_ERROR"},
            )

    return IngestResponse(
        doc_name=file.filename,
        chunks_ingested=chunks_ingested,
        collection=current_tenant.chroma_collection,
    )


@router.get(
    "",
    response_model=DocumentListResponse,
    summary="List documents",
    description="List all documents uploaded by the authenticated tenant.",
)
async def list_documents(
    request: Request,
    current_tenant: Tenant = Depends(get_current_tenant),
):
    """Return all documents in the tenant's collection with chunk counts."""
    chroma_client = request.app.state.chroma_client

    docs = vector_service.list_documents(
        collection_name=current_tenant.chroma_collection,
        chroma_client=chroma_client,
    )

    documents = [DocumentInfo(doc_name=d["doc_name"], chunk_count=d["chunk_count"]) for d in docs]
    total_chunks = sum(d["chunk_count"] for d in docs)

    return DocumentListResponse(
        tenant_id=current_tenant.id,
        documents=documents,
        total_chunks=total_chunks,
    )


@router.delete(
    "/{doc_name}",
    response_model=DocumentDeleteResponse,
    summary="Delete a document",
    description="Delete a document and all its vector chunks from the collection.",
)
async def delete_document(
    doc_name: str,
    request: Request,
    current_tenant: Tenant = Depends(get_current_tenant),
):
    """Remove all chunks for a specific document from ChromaDB."""
    chroma_client = request.app.state.chroma_client

    deleted_count = vector_service.delete_document(
        doc_name=doc_name,
        collection_name=current_tenant.chroma_collection,
        chroma_client=chroma_client,
    )

    if deleted_count == 0:
        raise HTTPException(
            status_code=404,
            detail={"error": f"Document '{doc_name}' not found.", "code": "DOCUMENT_NOT_FOUND"},
        )

    return DocumentDeleteResponse(
        message=f"Deleted {deleted_count} chunks for '{doc_name}'."
    )
