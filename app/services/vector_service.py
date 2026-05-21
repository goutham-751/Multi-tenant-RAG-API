"""
Vector service — ChromaDB operations for document ingestion and retrieval.

All vector operations are scoped by tenant collection name. The collection
name is always derived from the authenticated tenant's record — never from
user input. This is the primary layer of tenant isolation for document data.
"""

import os
import tempfile
from typing import Any

import chromadb
from langchain_community.document_loaders import PyPDFLoader, TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from sentence_transformers import SentenceTransformer

from app.core.config import settings


def get_chroma_client() -> chromadb.ClientAPI:
    """Create a persistent ChromaDB client."""
    return chromadb.PersistentClient(path=settings.CHROMA_PERSIST_DIR)


def get_embedding_model() -> SentenceTransformer:
    """Load the sentence-transformer embedding model."""
    return SentenceTransformer(settings.EMBEDDING_MODEL)


def ingest_document(
    file_bytes: bytes,
    filename: str,
    collection_name: str,
    chroma_client: chromadb.ClientAPI,
    embed_model: SentenceTransformer,
) -> int:
    """
    Ingest a document: load → chunk → embed → upsert to ChromaDB.

    Args:
        file_bytes: Raw file content
        filename: Original filename (used for doc_name metadata)
        collection_name: Tenant's ChromaDB collection (from tenant record)
        chroma_client: ChromaDB client instance
        embed_model: SentenceTransformer model

    Returns:
        Number of chunks ingested

    Raises:
        ValueError: If file type is unsupported or no text extracted
    """
    ext = os.path.splitext(filename)[1].lower()
    if ext not in {".pdf", ".txt", ".md"}:
        raise ValueError(f"Unsupported file type: {ext}. Accepted: .pdf, .txt, .md")

    # Write to temp file for loaders
    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
        tmp.write(file_bytes)
        tmp_path = tmp.name

    try:
        # Load document
        if ext == ".pdf":
            loader = PyPDFLoader(tmp_path)
        else:
            loader = TextLoader(tmp_path, encoding="utf-8")

        documents = loader.load()

        if not documents or not any(doc.page_content.strip() for doc in documents):
            raise ValueError("No extractable text found in document.")

        # Chunk
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=settings.CHUNK_SIZE,
            chunk_overlap=settings.CHUNK_OVERLAP,
        )
        chunks = splitter.split_documents(documents)

        if not chunks:
            raise ValueError("No extractable text found in document.")

        # Prepare texts and metadata
        texts = [chunk.page_content for chunk in chunks]
        ids = [f"{filename}__chunk_{i}" for i in range(len(chunks))]
        metadatas = [
            {
                "doc_name": filename,
                "chunk_index": i,
                "text": chunk.page_content[:500],
            }
            for i, chunk in enumerate(chunks)
        ]

        # Embed
        embeddings = embed_model.encode(texts, batch_size=32, show_progress_bar=False)
        embeddings_list = [emb.tolist() for emb in embeddings]

        # Upsert to ChromaDB
        collection = chroma_client.get_or_create_collection(name=collection_name)
        collection.upsert(
            ids=ids,
            embeddings=embeddings_list,
            documents=texts,
            metadatas=metadatas,
        )

        return len(chunks)

    finally:
        # Clean up temp file
        os.unlink(tmp_path)


def retrieve_dense(
    question_embedding: list[float],
    collection_name: str,
    chroma_client: chromadb.ClientAPI,
    top_k: int = 10,
) -> list[dict[str, Any]]:
    """
    Dense retrieval from ChromaDB — returns top-k chunks by cosine similarity.

    Returns list of dicts with keys: id, document, metadata, distance
    """
    try:
        collection = chroma_client.get_collection(name=collection_name)
    except Exception:
        return []

    results = collection.query(
        query_embeddings=[question_embedding],
        n_results=min(top_k, collection.count()) if collection.count() > 0 else top_k,
        include=["documents", "metadatas", "distances"],
    )

    if not results["ids"] or not results["ids"][0]:
        return []

    chunks = []
    for i, doc_id in enumerate(results["ids"][0]):
        chunks.append({
            "id": doc_id,
            "document": results["documents"][0][i],
            "metadata": results["metadatas"][0][i],
            "distance": results["distances"][0][i],
        })

    return chunks


def list_documents(
    collection_name: str,
    chroma_client: chromadb.ClientAPI,
) -> list[dict[str, Any]]:
    """
    List all unique documents in a tenant's collection.

    Returns list of dicts: {doc_name, chunk_count}
    """
    try:
        collection = chroma_client.get_collection(name=collection_name)
    except Exception:
        return []

    if collection.count() == 0:
        return []

    # Get all metadata
    all_data = collection.get(include=["metadatas"])
    doc_counts: dict[str, int] = {}
    for meta in all_data["metadatas"]:
        name = meta.get("doc_name", "unknown")
        doc_counts[name] = doc_counts.get(name, 0) + 1

    return [{"doc_name": name, "chunk_count": count} for name, count in doc_counts.items()]


def delete_document(
    doc_name: str,
    collection_name: str,
    chroma_client: chromadb.ClientAPI,
) -> int:
    """
    Delete all chunks for a specific document from the tenant's collection.

    Returns the number of chunks deleted.
    """
    try:
        collection = chroma_client.get_collection(name=collection_name)
    except Exception:
        return 0

    # Find all chunks with this doc_name
    all_data = collection.get(include=["metadatas"])
    ids_to_delete = []
    for i, meta in enumerate(all_data["metadatas"]):
        if meta.get("doc_name") == doc_name:
            ids_to_delete.append(all_data["ids"][i])

    if ids_to_delete:
        collection.delete(ids=ids_to_delete)

    return len(ids_to_delete)
