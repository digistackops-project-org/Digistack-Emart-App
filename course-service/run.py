#!/usr/bin/env python3
# ============================================================
# run.py
# Production entry point for the Course Service.
# Starts uvicorn with settings from environment variables.
#
# Physical server:  python run.py
# Systemd service:  ExecStart=/opt/emart/course-service/venv/bin/python run.py
# Docker/K8s:       CMD ["python", "run.py"]
# ============================================================
import uvicorn
from app.core.config import get_settings

if __name__ == "__main__":
    settings = get_settings()

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=settings.port,
        workers=1,                          # Single worker per process (scale via K8s replicas)
        log_level=settings.log_level.lower(),
        access_log=not settings.is_production,
        reload=settings.app_env == "development",
        loop="uvloop",                      # Faster event loop (installed with uvicorn[standard])
    )
