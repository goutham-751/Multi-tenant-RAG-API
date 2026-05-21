"""
Database engine and session management.

Uses SQLModel + SQLite for zero-setup persistent storage.
The session dependency is injected into every route that needs DB access.
"""

from sqlmodel import Session, SQLModel, create_engine

from app.core.config import settings

# SQLite engine — single file, no server required
_sqlite_url = f"sqlite:///{settings.SQLITE_DB_PATH}"
engine = create_engine(
    _sqlite_url,
    echo=False,
    connect_args={"check_same_thread": False},  # Required for SQLite + FastAPI
)


def create_db_and_tables() -> None:
    """Create all SQLModel tables if they don't exist."""
    SQLModel.metadata.create_all(engine)


def get_session():
    """FastAPI dependency — yields a DB session, auto-closes on exit."""
    with Session(engine) as session:
        yield session
