# ============================================================
# app/schemas/course.py
# Pydantic v2 schemas for request validation and response
# serialisation. Separate from ORM models (clean architecture).
# ============================================================
from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, field_validator


# ── Allowed categories ────────────────────────────────────────
CategoryType = Literal[
    "programming", "data-science", "design",
    "business", "mathematics", "language", "other"
]

LevelType = Literal["beginner", "intermediate", "advanced", "all-levels"]


# ── Base schema (shared fields) ───────────────────────────────
class CourseBase(BaseModel):
    name: str = Field(
        ..., min_length=1, max_length=255,
        description="Course title — displayed as 50% of card"
    )
    author: str = Field(
        ..., min_length=1, max_length=255,
        description="Instructor name — displayed as 20% of card"
    )
    cost: Decimal = Field(
        ..., ge=0, decimal_places=2,
        description="Course price in INR — displayed as 20% of card"
    )
    description: Optional[str] = Field(
        default=None, max_length=3000,
        description="Full course description — shown in Add Course form"
    )
    category: CategoryType = Field(default="programming")
    duration_hours: Optional[int] = Field(default=None, ge=0, le=10000)
    level: Optional[LevelType] = Field(default=None)
    stock: int = Field(default=0, ge=0)
    image_url: Optional[str] = Field(default=None)
    video_url: Optional[str] = Field(default=None)

    @field_validator("name", "author", mode="before")
    @classmethod
    def strip_whitespace(cls, v: str) -> str:
        return v.strip() if isinstance(v, str) else v

    @field_validator("cost", mode="before")
    @classmethod
    def coerce_cost(cls, v):
        if isinstance(v, (int, float)):
            return Decimal(str(v))
        return v


# ── Request: Create ───────────────────────────────────────────
class CourseCreate(CourseBase):
    pass


# ── Request: Update (all fields optional — PATCH style) ───────
class CourseUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    author: Optional[str] = Field(default=None, min_length=1, max_length=255)
    cost: Optional[Decimal] = Field(default=None, ge=0)
    description: Optional[str] = Field(default=None, max_length=3000)
    category: Optional[CategoryType] = None
    duration_hours: Optional[int] = Field(default=None, ge=0)
    level: Optional[LevelType] = None
    stock: Optional[int] = Field(default=None, ge=0)
    image_url: Optional[str] = None
    video_url: Optional[str] = None

    @field_validator("name", "author", mode="before")
    @classmethod
    def strip_whitespace(cls, v):
        return v.strip() if isinstance(v, str) else v


# ── Response: Course out (returned to frontend) ───────────────
class CourseOut(CourseBase):
    model_config = ConfigDict(from_attributes=True)  # allows ORM → schema

    id: int
    is_active: bool
    schema_version: int
    created_at: datetime
    updated_at: datetime


# ── Response: Paginated list ──────────────────────────────────
class CoursesListOut(BaseModel):
    courses: list[CourseOut]
    total: int
    returned: int
    limit: int
    offset: int


# ── Shared API envelope ───────────────────────────────────────
class ApiResponse(BaseModel):
    success: bool
    message: str
    data: Optional[dict | list | CourseOut | CoursesListOut] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


# ── Query params schema ───────────────────────────────────────
class CourseQueryParams(BaseModel):
    category: Optional[CategoryType] = None
    search: Optional[str] = Field(default=None, max_length=100)
    level: Optional[LevelType] = None
    limit: int = Field(default=100, ge=1, le=500)
    offset: int = Field(default=0, ge=0)
