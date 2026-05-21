# **Product Requirements Document**

## **Multi-Tenant RAG API — SaaS Platform**

**Version:** 1.0.0  
 **Author:** Goutham  
 **Status:** Active Development  
 **Last Updated:** May 2026

---

## **1\. Product Overview**

### **1.1 What is this product?**

The Multi-Tenant RAG API is a backend SaaS platform that allows any business or developer to upload their own documents and query them using natural language — powered by Retrieval-Augmented Generation (RAG). Each client (tenant) operates in a completely isolated environment: their documents, vectors, and query history are never accessible to any other tenant.

Think of it as the infrastructure layer that powers tools like Notion AI, Intercom Fin, or Glean — but exposed as a clean REST API that any frontend, chatbot, or internal tool can call.

### **1.2 Problem Statement**

Large language models hallucinate when asked questions outside their training data. Businesses need LLMs to answer questions grounded in their own private documents — HR policies, legal contracts, product manuals, knowledge bases — not from the internet. Existing solutions are either too expensive (OpenAI Assistants API), too locked-in (vendor-specific), or require significant ML infrastructure to set up. This product solves all three.

### **1.3 Target Users**

| User Type | Description | Primary Need |
| ----- | ----- | ----- |
| SaaS Developers | Building chatbots or search into their own product | REST API to embed Q\&A into their app |
| Enterprises | Internal knowledge base search | Isolated, secure document querying |
| Startups | Customer support automation | Fast, cheap LLM answers from their own docs |
| Indie Hackers | No-code-adjacent document AI | Simple API with a free tier |

### **1.4 Core Value Proposition**

* **Zero hallucination by design** — answers only come from uploaded documents  
* **Complete tenant isolation** — one client can never see another's data  
* **Zero infrastructure cost** — runs on free-tier services (Groq, HuggingFace Spaces)  
* **Production-ready from day one** — auth, rate limiting, caching, and error handling built in  
* **Language-agnostic** — any client that can make HTTP requests can use it

---

## **2\. Technical Architecture**

### **2.1 System Overview**

┌─────────────────────────────────────────────────────────────┐  
│                        CLIENT LAYER                          │  
│          (Any HTTP client — curl, frontend, chatbot)         │  
└─────────────────────────┬───────────────────────────────────┘  
                          │ HTTPS  
┌─────────────────────────▼───────────────────────────────────┐  
│                      FASTAPI LAYER                           │  
│   Auth Middleware → Rate Limiter → Router → Error Handler    │  
└──────┬────────────────────┬────────────────────┬────────────┘  
       │                    │                    │  
┌──────▼──────┐   ┌─────────▼──────┐   ┌────────▼────────┐  
│  TENANT DB  │   │  VECTOR STORE  │   │   LLM LAYER     │  
│  (SQLite)   │   │  (ChromaDB)    │   │  (Groq / Llama) │  
│             │   │                │   │                 │  
│ \- tenants   │   │ Per-tenant     │   │ Context-grounded│  
│ \- api keys  │   │ collections    │   │ generation with │  
│ \- usage log │   │ (namespaced)   │   │ 8s timeout \+    │  
└─────────────┘   └────────────────┘   │ fallback        │  
                                       └─────────────────┘  
       ┌────────────────────────────────────┐  
       │         CROSS-CUTTING CONCERNS     │  
       │  In-memory Query Cache (TTL=1hr)   │  
       │  Sliding Window Rate Limiter       │  
       │  Structured Logging \+ Request IDs  │  
       └────────────────────────────────────┘

### **2.2 Tech Stack**

| Layer | Technology | Rationale |
| ----- | ----- | ----- |
| Web Framework | FastAPI 0.115 | Async, auto OpenAPI, Pydantic validation |
| ORM \+ DB | SQLModel \+ SQLite | Zero-setup, single file, Pydantic-native |
| Vector Store | ChromaDB 0.5 | In-process, persistent, free, namespace isolation via collections |
| Embeddings | sentence-transformers `all-MiniLM-L6-v2` | Free, local, 384-dim, fast |
| LLM | Groq API (Llama 3.3-70B) | Free tier, sub-second inference |
| LLM Orchestration | LangChain 0.3 | Chunking, loaders, prompt templates |
| Sparse Retrieval | rank-bm25 | BM25 for keyword-aware hybrid retrieval |
| Security | bcrypt | API key hashing |
| Testing | pytest \+ FastAPI TestClient | Unit \+ integration, no real HTTP |
| Load Testing | locust | Pure Python, headless mode |
| CI | GitHub Actions | Test on every push to main |
| Deployment | HuggingFace Spaces | Free, HTTPS, push-to-deploy |

### **2.3 Data Flow — Document Ingestion**

POST /api/v1/documents  
    │  
    ├─ Auth: verify X-API-Key header → resolve tenant  
    ├─ Rate limit check: sliding window (20 req/min)  
    ├─ Validate: file extension in {.pdf, .txt, .md}, size \< 10MB  
    │  
    ├─ Load: PyPDFLoader or TextLoader  
    ├─ Chunk: RecursiveCharacterTextSplitter  
    │         chunk\_size=500, overlap=50  
    │  
    ├─ Embed: SentenceTransformer.encode(chunks, batch\_size=32)  
    │         → float32 vectors, dim=384  
    │  
    ├─ Upsert: ChromaDB collection "tenant\_{id}"  
    │          metadata: {doc\_name, chunk\_index, text\[:500\]}  
    │  
    └─ Response: {doc\_name, chunks\_ingested, collection}

### **2.4 Data Flow — Query**

POST /api/v1/query  
    │  
    ├─ Auth \+ Rate limit  
    ├─ Cache check: SHA256(tenant\_id \+ question) → dict lookup  
    │   └─ HIT: return cached response, X-Cache: HIT  
    │  
    ├─ MISS:  
    │   ├─ Embed question → 384-dim vector  
    │   │  
    │   ├─ Dense retrieval: ChromaDB.query(tenant collection, top\_k=10)  
    │   ├─ Sparse retrieval: BM25Okapi on retrieved chunk texts  
    │   ├─ RRF merge: score \= 1/(60+dense\_rank) \+ 1/(60+bm25\_rank)  
    │   └─ Final context: top 5 chunks by RRF score  
    │  
    ├─ LLM: Groq chat completion  
    │       prompt: context chunks \+ question  
    │       max\_tokens=1024, temperature=0.1, timeout=8s  
    │   └─ Timeout fallback: return top chunk as plain text  
    │  
    ├─ Cache result (if not fallback)  
    ├─ Increment tenant.queries\_count  
    └─ Response: {answer, sources\[{doc\_name, snippet, chunk\_index}\],  
                  latency\_ms, cached, fallback}

---

## **3\. API Specification**

### **3.1 Base URL**

Production:  https://{your-space}.hf.space  
Development: http://localhost:8000

### **3.2 Authentication**

All endpoints except `/health` and `/api/v1/tenants/register` require:

X-API-Key: sk-{your\_key}

Keys are bcrypt-hashed in storage. Never stored or logged in plain text.

### **3.3 Endpoints**

#### **POST `/api/v1/tenants/register`**

Register a new tenant and receive an API key.

**Request:**

{ "name": "acme-corp" }

**Response 200:**

{  
  "tenant\_id": "uuid-string",  
  "name": "acme-corp",  
  "api\_key": "sk-abc123...",  
  "chroma\_collection": "tenant\_abc12345",  
  "message": "Store your API key safely — it will not be shown again."  
}

---

#### **GET `/api/v1/tenants/me`**

Returns current tenant metadata.

**Response 200:**

{  
  "tenant\_id": "uuid",  
  "name": "acme-corp",  
  "chroma\_collection": "tenant\_abc12345",  
  "queries\_count": 47,  
  "is\_active": true,  
  "created\_at": "2026-05-01T12:00:00"  
}

---

#### **POST `/api/v1/documents`**

Upload a document for ingestion.

**Request:** `multipart/form-data`, field name `file`, accepted types: `.pdf`, `.txt`, `.md`, max 10MB.

**Response 200:**

{  
  "message": "Document ingested successfully.",  
  "doc\_name": "policy.pdf",  
  "chunks\_ingested": 34,  
  "collection": "tenant\_abc12345"  
}

**Errors:**

* `400` — unsupported file type or empty file  
* `413` — file exceeds 10MB  
* `422` — no extractable text

---

#### **GET `/api/v1/documents`**

List all documents uploaded by this tenant.

**Response 200:**

{  
  "tenant\_id": "uuid",  
  "documents": \[  
    { "doc\_name": "policy.pdf", "chunk\_count": 34 },  
    { "doc\_name": "manual.txt", "chunk\_count": 12 }  
  \],  
  "total\_chunks": 46  
}

---

#### **DELETE `/api/v1/documents/{doc_name}`**

Delete a document and all its vectors.

**Response 200:**

{ "message": "Deleted 34 chunks for 'policy.pdf'." }

---

#### **POST `/api/v1/query`**

Ask a natural language question against uploaded documents.

**Request:**

{ "question": "What is the refund policy?" }

**Response 200:**

{  
  "answer": "The refund policy allows returns within 30 days of purchase...",  
  "sources": \[  
    {  
      "doc\_name": "policy.pdf",  
      "snippet": "Customers may return any item within 30 days...",  
      "chunk\_index": 4  
    }  
  \],  
  "latency\_ms": 340,  
  "cached": false,  
  "fallback": false  
}

**Headers returned:**

* `X-Cache: HIT | MISS`  
* `X-Request-ID: {uuid}`

---

#### **GET `/api/v1/query/usage`**

Returns query stats for the current tenant.

**Response 200:**

{  
  "tenant\_id": "uuid",  
  "queries\_today": 47,  
  "cache\_hit\_rate": 0.38,  
  "avg\_latency\_ms": 290.5  
}

---

#### **GET `/health`**

**Response 200:**

{ "status": "ok", "version": "1.0.0" }

### **3.4 Error Response Format**

All errors follow this schema — never a raw 500 or stack trace:

{  
  "error": "Human-readable message",  
  "code": "SNAKE\_CASE\_ERROR\_CODE"  
}

### **3.5 Rate Limiting**

* **Algorithm:** Sliding window  
* **Default limit:** 20 requests per 60 seconds per tenant  
* **On limit hit:** `429 Too Many Requests` with `Retry-After` header  
* **Config:** `RATE_LIMIT_REQUESTS` and `RATE_LIMIT_WINDOW_SECONDS` in `.env`

---

## **4\. Data Models**

### **4.1 Tenant (SQLite)**

| Field | Type | Description |
| ----- | ----- | ----- |
| id | UUID string | Primary key |
| name | string | Tenant display name |
| api\_key\_hash | string | bcrypt hash of the API key |
| chroma\_collection | string | ChromaDB collection name: `tenant_{id_prefix}` |
| queries\_count | int | Lifetime query counter |
| is\_active | bool | Soft-delete flag |
| created\_at | datetime | UTC timestamp |

### **4.2 Vector Chunk (ChromaDB)**

| Field | Description |
| ----- | ----- |
| id | `{filename}__chunk_{index}` |
| embedding | float32\[384\] — sentence-transformer output |
| document | full chunk text |
| metadata.doc\_name | source filename |
| metadata.chunk\_index | position in original document |
| metadata.text | first 500 chars (for fast snippet retrieval) |

### **4.3 Chunking Strategy**

| Parameter | Value | Reason |
| ----- | ----- | ----- |
| chunk\_size | 500 tokens | Fits well within LLM context, captures full ideas |
| chunk\_overlap | 50 tokens | Preserves context at chunk boundaries |
| splitter | RecursiveCharacterTextSplitter | Respects paragraph and sentence structure |

---

## **5\. Security Model**

### **5.1 Tenant Isolation**

Isolation is enforced at two independent layers:

1. **Vector layer** — every ChromaDB query is scoped to `collection=tenant_{id}`. The collection name is derived from the JWT/API key claims at request time, not from the request body. A client cannot spoof another tenant's collection name.

2. **Cache layer** — cache key is `SHA256(tenant_id + question)`. Two tenants asking identical questions get their own independent cached responses.

### **5.2 API Key Security**

* Keys are generated with `secrets.token_urlsafe(32)` — 256 bits of entropy  
* Stored as bcrypt hash (cost factor 12\) — irreversible  
* Returned only once at registration — never logged or re-exposed  
* Verification is constant-time bcrypt comparison — safe against timing attacks

### **5.3 What is NOT in scope (v1.0)**

* JWT rotation  
* OAuth2 / SSO  
* IP allowlisting  
* Audit log persistence to disk (currently in-memory)  
* Encryption at rest for ChromaDB vectors

---

## **6\. Configuration Reference**

All configuration is via `.env` file using `pydantic-settings`. Defaults are production-safe.

\# Required  
GROQ\_API\_KEY=gsk\_your\_key\_here

\# LLM  
GROQ\_MODEL=llama-3.3-70b-versatile

\# Embeddings  
EMBEDDING\_MODEL=all-MiniLM-L6-v2

\# Storage paths  
CHROMA\_PERSIST\_DIR=./chroma\_store  
SQLITE\_DB\_PATH=./rag.db

\# Chunking  
CHUNK\_SIZE=500  
CHUNK\_OVERLAP=50  
TOP\_K\_RESULTS=5

\# Rate limiting  
RATE\_LIMIT\_REQUESTS=20  
RATE\_LIMIT\_WINDOW\_SECONDS=60

\# Cache  
CACHE\_TTL\_SECONDS=3600

---

## **7\. Project File Structure**

rag-api/  
│  
├── app/  
│   ├── main.py                  \# FastAPI app, lifespan, global exception handler  
│   ├── db.py                    \# SQLite engine, session dependency  
│   │  
│   ├── core/  
│   │   ├── config.py            \# pydantic-settings — all env vars  
│   │   ├── security.py          \# bcrypt hash/verify, API key generation, SHA256  
│   │   └── dependencies.py      \# get\_current\_tenant FastAPI dependency (auth \+ rate limit)  
│   │  
│   ├── models/  
│   │   ├── tenant.py            \# Tenant SQLModel table \+ register/info Pydantic schemas  
│   │   └── schemas.py           \# IngestResponse, QueryRequest, QueryResponse, UsageResponse  
│   │  
│   ├── routers/  
│   │   ├── tenants.py           \# POST /register, GET /me  
│   │   ├── documents.py         \# POST, GET, DELETE /documents  
│   │   └── query.py             \# POST /query, GET /query/usage  
│   │  
│   └── services/  
│       ├── tenant\_service.py    \# create\_tenant, get\_by\_api\_key, increment\_queries  
│       ├── vector\_service.py    \# ChromaDB ingest, dense retrieve, list, delete  
│       ├── rag\_service.py       \# Groq LLM call, prompt build, fallback logic  
│       ├── cache.py             \# QueryCache class — TTL dict, tenant-scoped keys  
│       └── rate\_limiter.py      \# RateLimiter class — sliding window per tenant  
│  
├── tests/  
│   └── test\_api.py              \# pytest suite — auth, rate limit, ingest, isolation  
│  
├── benchmarks/  
│   └── locustfile.py            \# Load test — 20 VUs, mixed query/list traffic  
│  
├── .github/  
│   └── workflows/ci.yml         \# pytest on every push to main  
│  
├── requirements.txt  
├── .env.example  
├── .gitignore  
└── README.md

---

## **8\. Development Phases**

### **Phase 1 — Foundation (Week 1\) ✅**

* \[x\] FastAPI skeleton with health endpoint  
* \[x\] SQLite \+ SQLModel tenant table  
* \[x\] Tenant registration with bcrypt API key  
* \[x\] Auth middleware (`get_current_tenant` dependency)  
* \[x\] Sliding window rate limiter  
* \[x\] Pytest suite for auth flows

### **Phase 2 — RAG Core (Week 2\)**

* \[ \] ChromaDB integration — per-tenant collection creation  
* \[ \] Document ingestion — PDF \+ TXT, chunking, embedding, upsert  
* \[ \] Query endpoint — dense retrieval \+ Groq generation  
* \[ \] In-memory query cache with TTL  
* \[ \] Tenant isolation integration test  
* \[ \] Graceful fallback on LLM timeout  
* \[ \] Tag v0.2.0-rag

### **Phase 3 — Production Polish (Week 3\)**

* \[ \] Request ID middleware \+ structured logging  
* \[ \] Hybrid BM25 \+ dense retrieval with RRF  
* \[ \] Full Pydantic schemas with OpenAPI examples on all endpoints  
* \[ \] `/query/usage` endpoint — cache hit rate, avg latency  
* \[ \] DELETE /documents endpoint  
* \[ \] GitHub Actions CI with green badge  
* \[ \] 85%+ pytest coverage  
* \[ \] Tag v0.3.0-polished

### **Phase 4 — Deploy \+ Benchmark (Week 4\)**

* \[ \] HuggingFace Spaces Dockerfile \+ deployment  
* \[ \] locust benchmark: 20 VUs, 5 min, mixed traffic  
* \[ \] README: architecture diagram (Excalidraw), quickstart, benchmark results table  
* \[ \] 3-minute Loom demo recording  
* \[ \] dev.to / Medium blog post  
* \[ \] LinkedIn post with metrics  
* \[ \] Tag v1.0.0 GitHub Release

---

## **9\. Future Scope (Post v1.0 — Not in current build)**

These are intentionally excluded from v1.0 to keep the build achievable in 4 weeks. They represent natural v2.0 extensions:

| Feature | Description | Complexity |
| ----- | ----- | ----- |
| Persistent audit log | Store all queries to SQLite with timestamps | Low |
| Re-ranking with cross-encoder | Use `cross-encoder/ms-marco-MiniLM` for precision | Medium |
| Streaming responses | SSE stream for real-time token output | Medium |
| Webhook on ingest complete | Notify client URL when async ingestion finishes | Medium |
| Plan tiers | Free: 20 req/min, Pro: 100 req/min, different models | Medium |
| Admin dashboard | Simple React frontend — tenant management \+ usage charts | High |
| Multi-modal support | Image \+ table extraction from PDFs | High |
| RAGAS eval suite | Automated faithfulness \+ relevance scoring in CI | High |
| PostgreSQL migration | Swap SQLite for Postgres for horizontal scaling | Medium |
| Redis cache | Swap in-memory cache for Redis for multi-instance deploy | Medium |

---

## **10\. Non-Functional Requirements**

| Requirement | Target | How Measured |
| ----- | ----- | ----- |
| p95 latency (uncached) | \< 500ms | locust benchmark report |
| p95 latency (cached) | \< 10ms | locust benchmark report |
| Cache hit rate (warm) | \> 35% | `/query/usage` endpoint |
| Test coverage | ≥ 85% | pytest-cov report |
| API availability | 99%+ | Zero unhandled exceptions in test suite |
| Max file size | 10 MB | Enforced in documents router |
| LLM timeout | 8 seconds | Hard timeout in Groq client |

---

## **11\. Quickstart for New Contributors / AI Agents**

If you are an AI agent or developer picking up this codebase:

1. **Read `app/core/config.py` first** — every tunable parameter lives here  
2. **The auth flow** lives entirely in `app/core/dependencies.py` — one function, `get_current_tenant`, injected via `Depends()` into every protected route  
3. **Tenant isolation** is enforced in `vector_service.py` — the `collection_name` parameter is always derived from `current_tenant.chroma_collection`, never from user input  
4. **The cache key** in `cache.py` always includes `tenant_id` — this is a security requirement, not an optimisation  
5. **All errors** must go through the global handler in `main.py` — never raise a bare `Exception` from a router  
6. **To add a new endpoint**: add schema to `models/schemas.py` → add business logic to `services/` → add router function to `routers/` → include router in `main.py` → add test to `tests/test_api.py`  
7. **Run `pytest tests/ -v` before every commit** — CI will fail if tests don't pass

---

*End of PRD v1.0.0*

