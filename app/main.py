"""
FastAPI application entry point.

Sets up:
- Lifespan: initializes DB, ChromaDB, and embedding model at startup
- Global exception handler: all errors return {error, code} — never raw 500s
- Request ID middleware: UUID per request in response headers
- Structured logging
- All routers mounted under /api/v1/
- Health endpoint at /health
"""

import logging
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.db import create_db_and_tables
from app.routers import documents, query, tenants
from app.services.vector_service import get_chroma_client, get_embedding_model

# ---------------------------------------------------------------------------
# Structured logging
# ---------------------------------------------------------------------------

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("rag-api")


# ---------------------------------------------------------------------------
# Lifespan — startup & shutdown
# ---------------------------------------------------------------------------


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize shared resources at startup, clean up at shutdown."""
    logger.info("Starting Multi-Tenant RAG API v%s", settings.APP_VERSION)

    # Create database tables
    create_db_and_tables()
    logger.info("SQLite database initialized at %s", settings.SQLITE_DB_PATH)

    # Initialize ChromaDB client
    app.state.chroma_client = get_chroma_client()
    logger.info("ChromaDB initialized at %s", settings.CHROMA_PERSIST_DIR)

    # Load embedding model (downloads on first run)
    logger.info("Loading embedding model: %s ...", settings.EMBEDDING_MODEL)
    app.state.embed_model = get_embedding_model()
    logger.info("Embedding model loaded successfully")

    yield

    # Shutdown
    logger.info("Shutting down Multi-Tenant RAG API")


# ---------------------------------------------------------------------------
# App creation
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Multi-Tenant RAG API",
    description=(
        "A SaaS backend that lets any business upload documents and query them "
        "using natural language — powered by Retrieval-Augmented Generation (RAG). "
        "Complete tenant isolation, API key auth, rate limiting, and caching built in."
    ),
    version=settings.APP_VERSION,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all origins for local dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Middleware — Request ID
# ---------------------------------------------------------------------------


@app.middleware("http")
async def request_id_middleware(request: Request, call_next):
    """Attach a unique request ID to every response."""
    request_id = str(uuid.uuid4())
    request.state.request_id = request_id

    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id

    logger.info(
        "request_id=%s method=%s path=%s status=%s",
        request_id,
        request.method,
        request.url.path,
        response.status_code,
    )

    return response


# ---------------------------------------------------------------------------
# Global exception handlers
# ---------------------------------------------------------------------------


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Return structured error for all HTTP exceptions."""
    detail = exc.detail
    if isinstance(detail, dict):
        content = detail
    else:
        content = {"error": str(detail), "code": "HTTP_ERROR"}

    return JSONResponse(
        status_code=exc.status_code,
        content=content,
        headers=getattr(exc, "headers", None),
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Return structured error for validation failures."""
    return JSONResponse(
        status_code=422,
        content={
            "error": "Request validation failed.",
            "code": "VALIDATION_ERROR",
            "details": exc.errors(),
        },
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch-all: never expose raw stack traces."""
    request_id = getattr(request.state, "request_id", "unknown")
    logger.exception("Unhandled exception [request_id=%s]: %s", request_id, exc)

    return JSONResponse(
        status_code=500,
        content={
            "error": "An internal error occurred. Please try again later.",
            "code": "INTERNAL_ERROR",
        },
    )


# ---------------------------------------------------------------------------
# Health endpoint
# ---------------------------------------------------------------------------


@app.get(
    "/health",
    tags=["Health"],
    summary="Health check",
    description="Returns OK if the API is running.",
)
async def health_check():
    """Simple health check — no auth required."""
    return {"status": "ok", "version": settings.APP_VERSION}


@app.get("/", include_in_schema=False)
async def root():
    """Redirect the base URL to the Swagger UI."""
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url="/docs")


# ---------------------------------------------------------------------------
# Include routers
# ---------------------------------------------------------------------------

app.include_router(tenants.router)
app.include_router(documents.router)
app.include_router(query.router)
