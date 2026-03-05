-- ============================================================
-- Flyway Migration: V1__Create_courses_table.sql
-- Database:  coursedb (PostgreSQL)
-- Team:      DB Team
-- Phase:     4 — Course Microservice
--
-- Creates the primary courses table.
-- Number of active rows = number of cards shown on frontend.
--
-- Card layout from Product Spec:
--   50%  →  courses.name     (course title)
--   20%  →  courses.author   (instructor name)
--   20%  →  courses.cost     (price in INR)
--   10%  →  "Add to Cart"    (frontend button, uses id + name + cost)
-- ============================================================

CREATE TABLE IF NOT EXISTS courses (
    -- Primary key
    id                  BIGSERIAL           PRIMARY KEY,

    -- ── Card display fields (50 / 20 / 20) ───────────────────
    name                VARCHAR(255)        NOT NULL,
    author              VARCHAR(255)        NOT NULL,
    cost                DECIMAL(10, 2)      NOT NULL
                            CONSTRAINT courses_cost_non_negative
                            CHECK (cost >= 0),

    -- ── Add Course form fields ────────────────────────────────
    description         TEXT,
    category            VARCHAR(100)        NOT NULL    DEFAULT 'programming'
                            CONSTRAINT courses_category_valid
                            CHECK (category IN (
                                'programming','data-science','design',
                                'business','mathematics','language','other'
                            )),
    duration_hours      INTEGER             CHECK (duration_hours >= 0),
    level               VARCHAR(50)
                            CHECK (level IN ('beginner','intermediate','advanced','all-levels')),
    stock               INTEGER             NOT NULL    DEFAULT 0
                            CONSTRAINT courses_stock_non_negative
                            CHECK (stock >= 0),
    image_url           VARCHAR(500),
    video_url           VARCHAR(500),

    -- ── Lifecycle ─────────────────────────────────────────────
    is_active           BOOLEAN             NOT NULL    DEFAULT TRUE,
    schema_version      INTEGER             NOT NULL    DEFAULT 1,

    -- ── Audit timestamps (stored in UTC) ─────────────────────
    created_at          TIMESTAMP WITH TIME ZONE        DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE        DEFAULT NOW()
);

-- ── Auto-update updated_at on every UPDATE ───────────────────
CREATE OR REPLACE FUNCTION update_courses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER courses_updated_at
    BEFORE UPDATE ON courses
    FOR EACH ROW
    EXECUTE FUNCTION update_courses_updated_at();

-- ── Column documentation ──────────────────────────────────────
COMMENT ON TABLE  courses               IS 'Emart Courses catalogue — managed by Course Microservice (Python/FastAPI)';
COMMENT ON COLUMN courses.name          IS 'Course title — 50% of frontend card';
COMMENT ON COLUMN courses.author        IS 'Instructor/author name — 20% of frontend card';
COMMENT ON COLUMN courses.cost          IS 'Course price in INR — 20% of frontend card';
COMMENT ON COLUMN courses.description   IS 'Full description — shown in Add Course modal form';
COMMENT ON COLUMN courses.category      IS 'programming | data-science | design | business | mathematics | language | other';
COMMENT ON COLUMN courses.duration_hours IS 'Total video/content hours';
COMMENT ON COLUMN courses.level         IS 'beginner | intermediate | advanced | all-levels';
COMMENT ON COLUMN courses.is_active     IS 'Soft-delete flag — FALSE hides course from all GET endpoints';
