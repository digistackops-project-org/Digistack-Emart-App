# ============================================================
# app/core/database.py
# Async PostgreSQL engine and session factory.
# Uses SQLAlchemy 2.0 async API with asyncpg driver.
# Single engine instance — shared across all requests.
# ============================================================
from __future__ import annotations

import logging
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import text

from app.core.config import get_settings

logger = logging.getLogger(__name__)


class Base(DeclarativeBase):
    """SQLAlchemy declarative base — all models inherit from this."""
    pass


# ── Engine (created once at startup) ─────────────────────────
def create_engine() -> AsyncEngine:
    settings = get_settings()

    connect_args: dict = {}
    if settings.db_ssl:
        connect_args["ssl"] = "require"

    engine = create_async_engine(
        settings.database_url,
        pool_size=settings.db_pool_max,
        max_overflow=0,
        pool_pre_ping=True,           # Detect stale connections
        pool_recycle=3600,            # Recycle connections every hour
        echo=settings.debug,          # Log SQL in debug mode
        connect_args=connect_args,
    )
    logger.info(
        "PostgreSQL engine created",
        extra={
            "host": settings.db_host,
            "port": settings.db_port,
            "database": settings.db_name,
        },
    )
    return engine


# Module-level singletons — replaced in tests
_engine: AsyncEngine | None = None
_session_factory: async_sessionmaker[AsyncSession] | None = None


def get_engine() -> AsyncEngine:
    global _engine
    if _engine is None:
        _engine = create_engine()
    return _engine


def get_session_factory() -> async_sessionmaker[AsyncSession]:
    global _session_factory
    if _session_factory is None:
        _session_factory = async_sessionmaker(
            bind=get_engine(),
            class_=AsyncSession,
            expire_on_commit=False,
            autoflush=False,
            autocommit=False,
        )
    return _session_factory


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency — yields a database session per request."""
    session_factory = get_session_factory()
    async with session_factory() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def ping_db() -> bool:
    """Health check — verifies PostgreSQL connectivity."""
    try:
        async with get_engine().connect() as conn:
            await conn.execute(text("SELECT 1"))
        return True
    except Exception as exc:
        logger.error("PostgreSQL ping failed: %s", exc)
        return False


async def close_engine() -> None:
    """Graceful shutdown — dispose connection pool."""
    global _engine, _session_factory
    if _engine:
        await _engine.dispose()
        _engine = None
        _session_factory = None
        logger.info("PostgreSQL engine disposed")


def override_engine(engine: AsyncEngine) -> None:
    """Used in tests to inject a test-specific engine."""
    global _engine, _session_factory
    _engine = engine
    _session_factory = async_sessionmaker(
        bind=engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autoflush=False,
        autocommit=False,
    )
