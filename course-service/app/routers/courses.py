# ============================================================
# app/routers/courses.py
# Course CRUD REST API.
# All endpoints require Bearer JWT from Login Service.
# PostgreSQL coursedb.courses ↔ frontend card grid (one card per row).
#
# Card spec:
#   50% course name  →  courses.name
#   20% author       →  courses.author
#   20% cost         →  courses.cost
#   10% Add to Cart  →  frontend button (uses id + name + cost)
# ============================================================
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.middleware.auth import AuthenticatedUser, get_current_user
from app.models.course import Course
from app.schemas.course import (
    CourseCreate, CourseOut, CoursesListOut, CourseUpdate,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/courses", tags=["courses"])


# ── Response helpers ──────────────────────────────────────────
def ok(data, message: str = "Success", status_code: int = 200):
    from fastapi.responses import JSONResponse
    import json

    def serialise(obj):
        if hasattr(obj, "model_dump"):
            return obj.model_dump(mode="json")
        if isinstance(obj, datetime):
            return obj.isoformat()
        raise TypeError(f"Not serialisable: {type(obj)}")

    payload = {
        "success": True,
        "message": message,
        "data": json.loads(json.dumps(data, default=serialise)),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    return JSONResponse(status_code=status_code, content=payload)


def fail(message: str, status_code: int = 400):
    from fastapi.responses import JSONResponse
    return JSONResponse(
        status_code=status_code,
        content={
            "success": False,
            "message": message,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    )


# ============================================================
# GET /api/v1/courses
# Returns all active courses — count = number of cards on page.
# Supports optional filters: category, search, level
# ============================================================
@router.get("", summary="List all active courses")
async def list_courses(
    category: Optional[str] = Query(default=None, description="Filter by category"),
    search: Optional[str] = Query(default=None, max_length=100, description="Search in name/author"),
    level: Optional[str] = Query(default=None, description="Filter by level"),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user),
):
    # Base query — only active courses
    stmt = select(Course).where(Course.is_active == True)  # noqa: E712

    # Optional filters
    if category:
        stmt = stmt.where(Course.category == category.lower())
    if search:
        pattern = f"%{search}%"
        stmt = stmt.where(
            or_(
                func.lower(Course.name).like(func.lower(pattern)),
                func.lower(Course.author).like(func.lower(pattern)),
            )
        )
    if level:
        stmt = stmt.where(Course.level == level.lower())

    # Count total (before pagination)
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total_result = await db.execute(count_stmt)
    total = total_result.scalar_one()

    # Apply pagination and ordering
    stmt = stmt.order_by(Course.created_at.desc()).limit(limit).offset(offset)
    result = await db.execute(stmt)
    courses = result.scalars().all()

    logger.info(
        "list_courses user=%s returned=%d total=%d",
        user.email, len(courses), total,
    )

    data = CoursesListOut(
        courses=[CourseOut.model_validate(c) for c in courses],
        total=total,
        returned=len(courses),
        limit=limit,
        offset=offset,
    )
    return ok(data, f"{len(courses)} courses retrieved")


# ============================================================
# GET /api/v1/courses/{course_id}
# Returns a single course by ID.
# ============================================================
@router.get("/{course_id}", summary="Get course by ID")
async def get_course(
    course_id: int,
    db: AsyncSession = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user),
):
    if course_id <= 0:
        return fail("Invalid course ID", 400)

    result = await db.execute(
        select(Course).where(
            Course.id == course_id,
            Course.is_active == True,  # noqa: E712
        )
    )
    course = result.scalar_one_or_none()
    if not course:
        return fail(f"Course with ID {course_id} not found", 404)

    return ok(CourseOut.model_validate(course), "Course retrieved")


# ============================================================
# POST /api/v1/courses
# Creates a new course and stores in PostgreSQL coursedb.
# Required: name, author, cost
# Optional: description, category, duration_hours, level, stock
# ============================================================
@router.post("", summary="Create a new course", status_code=201)
async def create_course(
    payload: CourseCreate,
    db: AsyncSession = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user),
):
    course = Course(
        name=payload.name,
        author=payload.author,
        cost=payload.cost,
        description=payload.description,
        category=payload.category,
        duration_hours=payload.duration_hours,
        level=payload.level,
        stock=payload.stock,
        image_url=payload.image_url,
        video_url=payload.video_url,
        is_active=True,
        schema_version=1,
    )
    db.add(course)
    await db.commit()
    await db.refresh(course)

    logger.info(
        "create_course id=%d name=%r user=%s",
        course.id, course.name, user.email,
    )
    return ok(CourseOut.model_validate(course), "Course created successfully")


# ============================================================
# PUT /api/v1/courses/{course_id}
# Updates an existing course (PATCH semantics — only provided
# fields are updated, rest unchanged).
# ============================================================
@router.put("/{course_id}", summary="Update a course")
async def update_course(
    course_id: int,
    payload: CourseUpdate,
    db: AsyncSession = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user),
):
    result = await db.execute(
        select(Course).where(
            Course.id == course_id,
            Course.is_active == True,  # noqa: E712
        )
    )
    course = result.scalar_one_or_none()
    if not course:
        return fail(f"Course with ID {course_id} not found", 404)

    # Only update fields that were explicitly provided
    update_data = payload.model_dump(exclude_none=True, exclude_unset=True)
    for field, value in update_data.items():
        setattr(course, field, value)

    course.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(course)

    logger.info("update_course id=%d user=%s", course_id, user.email)
    return ok(CourseOut.model_validate(course), "Course updated successfully")


# ============================================================
# DELETE /api/v1/courses/{course_id}
# Soft-delete: sets is_active=FALSE.
# Deleted courses are not returned in GET /courses.
# ============================================================
@router.delete("/{course_id}", summary="Soft-delete a course")
async def delete_course(
    course_id: int,
    db: AsyncSession = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user),
):
    result = await db.execute(
        select(Course).where(
            Course.id == course_id,
            Course.is_active == True,  # noqa: E712
        )
    )
    course = result.scalar_one_or_none()
    if not course:
        return fail(f"Course with ID {course_id} not found", 404)

    course.is_active = False
    course.updated_at = datetime.now(timezone.utc)
    await db.commit()

    logger.info(
        "delete_course id=%d name=%r user=%s",
        course_id, course.name, user.email,
    )
    return ok({"id": course_id}, "Course deleted successfully")
