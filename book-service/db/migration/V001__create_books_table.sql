-- =============================================================
-- V001__create_books_table.sql
-- Book Service — Initial schema
-- =============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS books (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(255)    NOT NULL,           -- book name (as used by frontend)
    author      VARCHAR(255)    NOT NULL,
    cost        NUMERIC(10, 2)  NOT NULL CHECK (cost >= 0),
    description TEXT,
    category    VARCHAR(100)    NOT NULL DEFAULT 'general',
    stock       INTEGER         NOT NULL DEFAULT 0 CHECK (stock >= 0),
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

ALTER TABLE books
    ADD CONSTRAINT uq_books_name_author UNIQUE (name, author);

COMMENT ON TABLE  books            IS 'Emart book catalogue managed by the Book Service';
COMMENT ON COLUMN books.name       IS 'Book title/name (max 255 chars)';
COMMENT ON COLUMN books.author     IS 'Author full name (max 255 chars)';
COMMENT ON COLUMN books.cost       IS 'Sale price in INR (2 decimal places)';
COMMENT ON COLUMN books.description IS 'Optional long-form description';
COMMENT ON COLUMN books.category   IS 'Book category: general|programming|science|mathematics|business|fiction|other';
COMMENT ON COLUMN books.stock      IS 'Available stock quantity';
