# ============================================================
# app/main.py
# FastAPI application factory.
# Does NOT call uvicorn.run() — entry point is run.py.
# This keeps the app importable by tests without binding a port.
# ============================================================
from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import get_settings
from app.core.database import close_engine, get_engine
from app.core.logging import setup_logging
from app.routers import courses, health

# Setup logging before anything else
setup_logging()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown lifecycle."""
    settings = get_settings()

    # ── Startup ───────────────────────────────────────────────
    logger.info(
        "Starting %s v%s [%s]",
        settings.app_name, settings.app_version, settings.app_env,
    )
    # Warm up the connection pool (verify DB is reachable)
    try:
        engine = get_engine()
        logger.info("PostgreSQL connection pool initialised")
    except Exception as exc:
        logger.error("Failed to initialise DB pool: %s", exc)

    yield

    # ── Shutdown ──────────────────────────────────────────────
    logger.info("Shutting down %s...", settings.app_name)
    await close_engine()
    logger.info("Course Service stopped cleanly")


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title="Emart Course Service",
        description=(
            "Course catalogue microservice for Emart platform. "
            "Returns one course card per PostgreSQL row."
        ),
        version=settings.app_version,
        docs_url="/docs" if not settings.is_production else None,
        redoc_url="/redoc" if not settings.is_production else None,
        openapi_url="/openapi.json" if not settings.is_production else None,
        lifespan=lifespan,
    )

    # ── CORS ─────────────────────────────────────────────────
    # All origins allowed — Nginx controls external access
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "X-Requested-With"],
    )

    # ── Routers ───────────────────────────────────────────────
    app.include_router(health.router)    # /health, /health/live, /health/ready
    app.include_router(courses.router)   # /api/v1/courses

    # ── Global exception handlers ─────────────────────────────
    @app.exception_handler(404)
    async def not_found_handler(request: Request, exc):
        return JSONResponse(
            status_code=404,
            content={
                "success": False,
                "message": f"Route not found: {request.method} {request.url.path}",
            },
        )

    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        logger.error("Unhandled exception: %s", exc, exc_info=True)
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "message": "An unexpected error occurred. Please try again.",
            },
        )

    return app


# Single app instance
app = create_app()
