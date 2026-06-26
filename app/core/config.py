"""
Application configuration — all tunable parameters.

Reads from .env file using pydantic-settings. Every configurable value in the
entire system is defined here. Defaults are production-safe.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Central configuration — loaded once at startup, injected everywhere."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # --- Required ---
    GROQ_API_KEY: str = "gsk_placeholder"
    
    # --- Supabase & Database ---
    SUPABASE_URL: str = "https://placeholder.supabase.co"
    SUPABASE_ANON_KEY: str = "placeholder_anon_key"
    SUPABASE_JWT_SECRET: str = "placeholder_jwt_secret"
    DATABASE_URL: str = "postgresql://placeholder"

    # --- LLM ---
    GROQ_MODEL: str = "llama-3.3-70b-versatile"

    # --- Embeddings ---
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"

    # --- Storage paths ---
    CHROMA_PERSIST_DIR: str = "./chroma_store"
    SQLITE_DB_PATH: str = "./rag.db"

    # --- Chunking ---
    CHUNK_SIZE: int = 500
    CHUNK_OVERLAP: int = 50
    TOP_K_RESULTS: int = 5

    # --- Rate limiting ---
    RATE_LIMIT_REQUESTS: int = 20
    RATE_LIMIT_WINDOW_SECONDS: int = 60

    # --- Cache ---
    CACHE_TTL_SECONDS: int = 3600

    # --- App ---
    APP_VERSION: str = "1.0.0"


# Singleton — import this everywhere
settings = Settings()
