# ============================================================
# app/models/course.py
# SQLAlchemy 2.0 ORM model for the courses table.
# Maps 1:1 with PostgreSQL coursedb.courses created by Flyway V1.
# ============================================================
from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional

from sqlalchemy import (
    BigInteger, Boolean, CheckConstraint, DateTime,
    Integer, Numeric, String, Text, func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Course(Base):
    """
    Courses catalogue table.
    Card display spec:
      50% → name     (course name)
      20% → author   (instructor/author)
      20% → cost     (price in INR)
      10% → "Add to Cart" button (frontend action, uses id + name + cost)
    """
    __tablename__ = "courses"
    __table_args__ = (
        CheckConstraint("cost >= 0", name="courses_cost_non_negative"),
        CheckConstraint("stock >= 0", name="courses_stock_non_negative"),
        CheckConstraint(
            "category IN ('programming','data-science','design','business','mathematics','language','other')",
            name="courses_category_valid",
        ),
    )

    # Primary key
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)

    # ── Card display fields ───────────────────────────────────
    name: Mapped[str] = mapped_column(
        String(255), nullable=False, comment="Course title — 50% of card"
    )
    author: Mapped[str] = mapped_column(
        String(255), nullable=False, comment="Instructor/author — 20% of card"
    )
    cost: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False, comment="Price in INR — 20% of card"
    )

    # ── Extended metadata (shown in Add Course form) ──────────
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    duration_hours: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    level: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    category: Mapped[str] = mapped_column(
        String(100), nullable=False, default="programming"
    )
    stock: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    image_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    video_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # ── Lifecycle ─────────────────────────────────────────────
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    schema_version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)

    # ── Audit timestamps (UTC) ────────────────────────────────
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    def __repr__(self) -> str:
        return f"<Course id={self.id} name={self.name!r} cost={self.cost}>"
