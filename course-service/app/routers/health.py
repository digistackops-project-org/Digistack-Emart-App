# ============================================================
# app/routers/health.py
# Three health endpoints — NO authentication required.
# Must be publicly accessible for:
#   • Nginx upstream health (physical server)
#   • K8s livenessProbe / readinessProbe
#   • Load balancer health checks
#
# GET /health          → process alive check
# GET /health/live     → liveness probe (process not hung)
# GET /health/ready    → readiness probe (PostgreSQL reachable)
# ============================================================
from __future__ import annotations

import logging
from datetime import datetime, timezone

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.core.config import get_settings
from app.core.database import ping_db

logger = logging.getLogger(__name__)
router = APIRouter(tags=["health"])

settings = get_settings()

META = {
    "service": settings.app_name,
    "version": settings.app_version,
}


@router.get("/health", summary="Basic alive check")
async def health() -> JSONResponse:
    """
    Returns 200 when the service process is running.
    Used by Nginx upstream health check and load balancers.
    """
    return JSONResponse(
        status_code=200,
        content={
            "status": "UP",
            "message": "Course service is running",
            **META,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    )


@router.get("/health/live", summary="Liveness probe")
async def liveness() -> JSONResponse:
    """
    Returns 200 when the process is alive and not hung.
    K8s livenessProbe — if this returns non-200, K8s restarts the pod.
    """
    return JSONResponse(
        status_code=200,
        content={
            "status": "UP",
            "probe": "liveness",
            "message": "Application process is alive",
            **META,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    )


@router.get("/health/ready", summary="Readiness probe")
async def readiness() -> JSONResponse:
    """
    Returns 200 when the service is ready to serve traffic.
    Returns 503 when PostgreSQL is unreachable.
    K8s readinessProbe — if this returns non-200, K8s removes pod from load balancer.
    """
    checks: dict[str, str] = {}
    all_healthy = True

    # Check PostgreSQL connectivity
    try:
        db_ok = await ping_db()
        checks["postgresql"] = "UP" if db_ok else "DOWN"
        if not db_ok:
            all_healthy = False
    except Exception as exc:
        logger.error("Health check PostgreSQL error: %s", exc)
        checks["postgresql"] = f"DOWN - {str(exc)[:100]}"
        all_healthy = False

    status_code = 200 if all_healthy else 503

    return JSONResponse(
        status_code=status_code,
        content={
            "status": "UP" if all_healthy else "DOWN",
            "probe": "readiness",
            "message": (
                "Application is ready to serve traffic"
                if all_healthy
                else "Application is NOT ready — dependencies unavailable"
            ),
            "checks": checks,
            **META,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    )
