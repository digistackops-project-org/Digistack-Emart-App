-- ============================================================
-- Flyway Migration: V2__Add_course_indexes.sql
-- Database:  coursedb
-- Team:      DB Team
-- Depends:   V1 (Flyway enforces order)
--
-- Performance indexes for courses table.
-- All partial indexes include WHERE is_active = TRUE
-- so deleted courses are excluded from index scans.
-- ============================================================

-- Default listing order (newest first = highest in card grid)
CREATE INDEX IF NOT EXISTS idx_courses_created_at
    ON courses (created_at DESC)
    WHERE is_active = TRUE;

-- Category filter (most common query from sidebar filter)
CREATE INDEX IF NOT EXISTS idx_courses_category
    ON courses (category)
    WHERE is_active = TRUE;

-- Name search — case-insensitive text search
CREATE INDEX IF NOT EXISTS idx_courses_name_lower
    ON courses (LOWER(name))
    WHERE is_active = TRUE;

-- Author search — case-insensitive
CREATE INDEX IF NOT EXISTS idx_courses_author_lower
    ON courses (LOWER(author))
    WHERE is_active = TRUE;

-- Level filter
CREATE INDEX IF NOT EXISTS idx_courses_level
    ON courses (level)
    WHERE is_active = TRUE;

-- Cost range queries (future price filter feature)
CREATE INDEX IF NOT EXISTS idx_courses_cost
    ON courses (cost)
    WHERE is_active = TRUE;

-- Composite: category + level (common filter combination)
CREATE INDEX IF NOT EXISTS idx_courses_category_level
    ON courses (category, level)
    WHERE is_active = TRUE;

-- Composite: category + created_at (category filter with default sort)
CREATE INDEX IF NOT EXISTS idx_courses_category_created
    ON courses (category, created_at DESC)
    WHERE is_active = TRUE;

-- Lifecycle index (queries that filter by is_active)
CREATE INDEX IF NOT EXISTS idx_courses_is_active
    ON courses (is_active);

-- ── Comments for DB team documentation ───────────────────────
COMMENT ON INDEX idx_courses_created_at     IS 'Default sort order for card grid — newest courses first';
COMMENT ON INDEX idx_courses_category       IS 'Category filter on course listing page';
COMMENT ON INDEX idx_courses_name_lower     IS 'Case-insensitive search in course name';
COMMENT ON INDEX idx_courses_author_lower   IS 'Case-insensitive search in instructor name';
COMMENT ON INDEX idx_courses_level          IS 'Beginner/Intermediate/Advanced filter';
COMMENT ON INDEX idx_courses_category_level IS 'Combined category + level filter — most common combination';
