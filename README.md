---
title: Multi-Tenant RAG API
emoji: 🚀
colorFrom: blue
colorTo: purple
sdk: docker
pinned: false
---

# 🚀 Multi-Tenant RAG API

A production-ready SaaS backend that lets any business upload documents and query them using natural language — powered by **Retrieval-Augmented Generation (RAG)**.

Each tenant operates in complete isolation: their documents, vectors, and query history are never accessible to any other tenant.

[![CI](https://github.com/YOUR_USERNAME/multi-tenant-rag-api/actions/workflows/ci.yml/badge.svg)](https://github.com/YOUR_USERNAME/multi-tenant-rag-api/actions)

---

## ✨ Features

- **Zero hallucination by design** — answers only come from uploaded documents
- **Complete tenant isolation** — one client can never see another's data
- **Hybrid retrieval** — BM25 + dense embeddings merged via Reciprocal Rank Fusion (RRF)
- **In-memory query cache** — TTL-based caching with tenant-scoped SHA256 keys
- **Sliding window rate limiting** — 20 req/min per tenant (configurable)
- **Graceful LLM fallback** — returns best chunk on timeout instead of failing
- **Production-ready** — auth, error handling, structured logging, request IDs

## 🏗️ Architecture

```
CLIENT (HTTP) → FastAPI Layer
                ├── Auth Middleware (bcrypt API key verification)
                ├── Rate Limiter (sliding window per tenant)
                ├── Router → Service Layer
                │   ├── Tenant DB (SQLite + SQLModel)
                │   ├── Vector Store (ChromaDB, per-tenant collections)
                │   └── LLM Layer (Groq / Llama 3.3-70B)
                └── Cross-cutting: Cache (TTL=1hr), Logging, Request IDs
```

## 🚀 Quickstart

### 1. Clone & Install

```bash
git clone https://github.com/YOUR_USERNAME/multi-tenant-rag-api.git
cd multi-tenant-rag-api
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure

```bash
cp .env.example .env
# Edit .env and add your GROQ_API_KEY
```

### 3. Run

```bash
uvicorn app.main:app --reload
```

The API is now live at `http://localhost:8000`. Explore the interactive docs at `http://localhost:8000/docs`.

### 4. Try It

```bash
# Register a tenant
curl -X POST http://localhost:8000/api/v1/tenants/register \
  -H "Content-Type: application/json" \
  -d '{"name": "acme-corp"}'

# Upload a document (replace YOUR_API_KEY)
curl -X POST http://localhost:8000/api/v1/documents \
  -H "X-API-Key: YOUR_API_KEY" \
  -F "file=@your_document.pdf"

# Query
curl -X POST http://localhost:8000/api/v1/query \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"question": "What is the refund policy?"}'
```

---



## 🧪 Testing

```bash
pytest tests/ -v
```

## 📊 Load Testing

```bash
export RAG_API_KEY="sk-your-key"
locust -f benchmarks/locustfile.py --headless -u 20 -r 5 --run-time 5m \
  --host http://localhost:8000
```

## 🐳 Docker

```bash
docker build -t rag-api .
docker run -p 7860:7860 --env-file .env rag-api
```

---

## 🔧 Configuration

All settings via `.env` file (see `.env.example`):

| Variable | Default | Description |
|----------|---------|-------------|
| `GROQ_API_KEY` | — | **Required.** Your Groq API key |
| `GROQ_MODEL` | `llama-3.3-70b-versatile` | LLM model |
| `EMBEDDING_MODEL` | `all-MiniLM-L6-v2` | Sentence transformer model |
| `CHUNK_SIZE` | `500` | Chunk size for text splitting |
| `CHUNK_OVERLAP` | `50` | Overlap between chunks |
| `TOP_K_RESULTS` | `5` | Final chunks sent to LLM |
| `RATE_LIMIT_REQUESTS` | `20` | Max requests per window |
| `RATE_LIMIT_WINDOW_SECONDS` | `60` | Rate limit window |
| `CACHE_TTL_SECONDS` | `3600` | Cache TTL (1 hour) |

---

## 📁 Project Structure

```
rag-api/
├── app/
│   ├── main.py              # FastAPI app, lifespan, error handlers
│   ├── db.py                # SQLite engine, session dependency
│   ├── core/
│   │   ├── config.py        # pydantic-settings — all env vars
│   │   ├── security.py      # bcrypt hash/verify, API key gen
│   │   └── dependencies.py  # get_current_tenant auth dependency
│   ├── models/
│   │   ├── tenant.py        # Tenant SQLModel table + schemas
│   │   └── schemas.py       # Request/response Pydantic models
│   ├── routers/
│   │   ├── tenants.py       # POST /register, GET /me
│   │   ├── documents.py     # POST, GET, DELETE /documents
│   │   └── query.py         # POST /query, GET /query/usage
│   └── services/
│       ├── tenant_service.py   # Tenant CRUD
│       ├── vector_service.py   # ChromaDB operations
│       ├── rag_service.py      # Groq LLM + hybrid retrieval
│       ├── cache.py            # In-memory TTL cache
│       └── rate_limiter.py     # Sliding window limiter
├── tests/
│   └── test_api.py          # pytest suite
├── benchmarks/
│   └── locustfile.py        # Locust load test
├── .github/workflows/ci.yml # GitHub Actions CI
├── requirements.txt
├── Dockerfile
├── .env.example
└── README.md
```

---

**Built with** FastAPI · SQLModel · ChromaDB · Groq · sentence-transformers · LangChain
