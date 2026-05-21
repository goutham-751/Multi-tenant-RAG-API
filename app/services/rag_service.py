"""
RAG service — Groq LLM generation with hybrid retrieval and fallback.

Implements the full RAG query pipeline:
1. Embed the question
2. Dense retrieval from ChromaDB (top_k=10)
3. Sparse retrieval via BM25 on retrieved texts
4. RRF (Reciprocal Rank Fusion) merge
5. Build grounded prompt from top-5 chunks
6. Call Groq LLM (8s timeout)
7. Fallback to raw chunk text on timeout
"""

import time
from typing import Any

from groq import Groq
from rank_bm25 import BM25Okapi
from sentence_transformers import SentenceTransformer

from app.core.config import settings
from app.services.vector_service import retrieve_dense


def _build_prompt(context_chunks: list[dict], question: str) -> str:
    """Build a grounding prompt that forces the LLM to answer only from context."""
    context_text = "\n\n---\n\n".join(
        f"[Source: {c['metadata'].get('doc_name', 'unknown')}, Chunk {c['metadata'].get('chunk_index', '?')}]\n{c['document']}"
        for c in context_chunks
    )

    return f"""You are a precise, helpful assistant. Answer the question using ONLY the context below.
If the answer is not in the context, say "I don't have enough information to answer this question based on the available documents."

Do NOT make up information. Do NOT use prior knowledge. Cite the source document when possible.

CONTEXT:
{context_text}

QUESTION: {question}

ANSWER:"""


def _hybrid_retrieval_rrf(
    question: str,
    collection_name: str,
    chroma_client: Any,
    embed_model: SentenceTransformer,
    top_k: int = 5,
) -> list[dict]:
    """
    Hybrid retrieval: dense (ChromaDB) + sparse (BM25) merged via RRF.

    RRF formula: score = 1/(60 + dense_rank) + 1/(60 + bm25_rank)
    Returns top_k chunks sorted by fused score.
    """
    # 1. Embed the question
    question_embedding = embed_model.encode(question, show_progress_bar=False).tolist()

    # 2. Dense retrieval — top 10 from ChromaDB
    dense_results = retrieve_dense(
        question_embedding=question_embedding,
        collection_name=collection_name,
        chroma_client=chroma_client,
        top_k=10,
    )

    if not dense_results:
        return []

    # 3. BM25 sparse retrieval on the dense-retrieved texts
    corpus = [r["document"] for r in dense_results]
    tokenized_corpus = [doc.lower().split() for doc in corpus]

    bm25 = BM25Okapi(tokenized_corpus)
    bm25_scores = bm25.get_scores(question.lower().split())

    # Build rank mappings
    # Dense ranks: already ordered by similarity (index = rank)
    dense_ranks = {i: rank for rank, i in enumerate(range(len(dense_results)))}

    # BM25 ranks: sort by score descending
    bm25_ranked_indices = sorted(range(len(bm25_scores)), key=lambda i: bm25_scores[i], reverse=True)
    bm25_ranks = {idx: rank for rank, idx in enumerate(bm25_ranked_indices)}

    # 4. RRF fusion
    k = 60  # RRF constant
    fused_scores = []
    for i in range(len(dense_results)):
        rrf_score = 1.0 / (k + dense_ranks[i]) + 1.0 / (k + bm25_ranks[i])
        fused_scores.append((i, rrf_score))

    # Sort by fused score, take top_k
    fused_scores.sort(key=lambda x: x[1], reverse=True)
    top_indices = [idx for idx, _ in fused_scores[:top_k]]

    return [dense_results[i] for i in top_indices]


def generate_answer(
    question: str,
    collection_name: str,
    chroma_client: Any,
    embed_model: SentenceTransformer,
) -> dict:
    """
    Full RAG pipeline: retrieve → fuse → generate → fallback.

    Returns dict with: answer, sources, latency_ms, cached (False), fallback
    """
    start = time.time()

    # Hybrid retrieval
    context_chunks = _hybrid_retrieval_rrf(
        question=question,
        collection_name=collection_name,
        chroma_client=chroma_client,
        embed_model=embed_model,
        top_k=settings.TOP_K_RESULTS,
    )

    if not context_chunks:
        latency_ms = round((time.time() - start) * 1000, 2)
        return {
            "answer": "No documents found. Please upload documents first.",
            "sources": [],
            "latency_ms": latency_ms,
            "cached": False,
            "fallback": True,
        }

    # Build sources list
    sources = [
        {
            "doc_name": c["metadata"].get("doc_name", "unknown"),
            "snippet": c["document"][:200],
            "chunk_index": c["metadata"].get("chunk_index", 0),
        }
        for c in context_chunks
    ]

    # Build prompt
    prompt = _build_prompt(context_chunks, question)

    # Call Groq LLM with timeout
    fallback = False
    try:
        groq_client = Groq(api_key=settings.GROQ_API_KEY)
        response = groq_client.chat.completions.create(
            model=settings.GROQ_MODEL,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=1024,
            temperature=0.1,
            timeout=8.0,
        )
        answer = response.choices[0].message.content.strip()
    except Exception:
        # Fallback: return the top chunk as plain text
        answer = f"[LLM timeout — returning best matching excerpt]\n\n{context_chunks[0]['document']}"
        fallback = True

    latency_ms = round((time.time() - start) * 1000, 2)

    return {
        "answer": answer,
        "sources": sources,
        "latency_ms": latency_ms,
        "cached": False,
        "fallback": fallback,
    }
