-- ============================================================
-- Flyway Migration: V1__Create_books_table.sql
-- Database: booksdb
-- Team:     DB Team
--
-- Creates the books table in PostgreSQL booksdb database.
-- This is the primary table for the Books Microservice.
-- All fields consumed by frontend card:
--   50% Book Name   →  name
--   20% Author      →  author
--   20% Cost        →  cost
--   10% Add to Cart →  (frontend button, uses id + name + cost)
-- ============================================================

CREATE TABLE IF NOT EXISTS books (
    -- Primary key
    id              BIGSERIAL           PRIMARY KEY,

    -- Core display fields (used in frontend book card)
    name            VARCHAR(255)        NOT NULL,
    author          VARCHAR(255)        NOT NULL,
    cost            DECIMAL(10, 2)      NOT NULL    CHECK (cost >= 0),

    -- Extended metadata (shown in book detail / add form)
    description     TEXT,
    isbn            VARCHAR(20)         UNIQUE,
    category        VARCHAR(100)        NOT NULL    DEFAULT 'general',
    stock           INTEGER             NOT NULL    DEFAULT 0    CHECK (stock >= 0),
    image_url       VARCHAR(500),

    -- Lifecycle fields
    is_active       BOOLEAN             NOT NULL    DEFAULT TRUE,
    schema_version  INTEGER             NOT NULL    DEFAULT 1,

    -- Audit timestamps (stored in UTC)
    created_at      TIMESTAMP WITH TIME ZONE        DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE        DEFAULT NOW()
);

-- ── Update trigger: auto-sets updated_at on every UPDATE ────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER books_updated_at
    BEFORE UPDATE ON books
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ── Comment the table and columns for DB team ────────────────
COMMENT ON TABLE  books             IS 'Emart Books catalogue — managed by Books Microservice';
COMMENT ON COLUMN books.name        IS 'Book title — 50% of card display';
COMMENT ON COLUMN books.author      IS 'Author full name — 20% of card display';
COMMENT ON COLUMN books.cost        IS 'Selling price in INR — 20% of card display';
COMMENT ON COLUMN books.description IS 'Full description — shown in Add Book form';
COMMENT ON COLUMN books.isbn        IS 'ISBN-10 or ISBN-13 (optional, unique)';
COMMENT ON COLUMN books.category    IS 'Book category: general, programming, science, etc.';
COMMENT ON COLUMN books.stock       IS 'Available inventory count';
COMMENT ON COLUMN books.is_active   IS 'Soft-delete flag — FALSE = hidden from frontend';
