"""
Database engine and session management.

Uses SQLModel + SQLite for zero-setup persistent storage.
The session dependency is injected into every route that needs DB access.
"""

from sqlmodel import Session, SQLModel, create_engine

from app.core.config import settings

# Postgres engine using psycopg2
engine = create_engine(
    settings.DATABASE_URL,
    echo=False,
)


def create_db_and_tables() -> None:
    """Create all SQLModel tables if they don't exist."""
    SQLModel.metadata.create_all(engine)


def get_session():
    """FastAPI dependency — yields a DB session, auto-closes on exit."""
    with Session(engine) as session:
        yield session
