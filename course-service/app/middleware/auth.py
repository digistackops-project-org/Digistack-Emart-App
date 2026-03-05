# ============================================================
# app/middleware/auth.py
# JWT authentication FastAPI dependency.
# Validates tokens ISSUED by the Login Service (Java/Spring Boot).
# Course Service NEVER issues tokens — only validates them.
# Uses the shared JWT_SECRET from /etc/emart/course.env.
# ============================================================
from __future__ import annotations

import logging
from datetime import datetime

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import get_settings

logger = logging.getLogger(__name__)

# FastAPI Bearer token extractor (reads "Authorization: Bearer <token>")
bearer_scheme = HTTPBearer(auto_error=True)


class AuthenticatedUser:
    """Decoded JWT payload attached to every authenticated request."""

    def __init__(self, payload: dict) -> None:
        self.user_id: str = payload.get("userId", "")
        self.email: str = payload.get("sub", "")   # Login Service uses sub=email
        self.name: str = payload.get("name", "")
        self.roles: list[str] = payload.get("roles", [])

    def has_role(self, role: str) -> bool:
        return role in self.roles


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> AuthenticatedUser:
    """
    FastAPI dependency — validates JWT and returns AuthenticatedUser.
    Raises 401 on missing/invalid/expired token.

    Usage:
        @router.get("/courses")
        async def list_courses(user: AuthenticatedUser = Depends(get_current_user)):
            ...
    """
    settings = get_settings()
    token = credentials.credentials

    if not settings.jwt_secret:
        logger.error("JWT_SECRET is not configured")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Server configuration error",
        )

    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
            options={"verify_exp": True},
        )
        user = AuthenticatedUser(payload)
        logger.debug("JWT verified for user: %s", user.email)
        return user

    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError as exc:
        logger.warning("JWT validation failed: %s", str(exc))
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )
