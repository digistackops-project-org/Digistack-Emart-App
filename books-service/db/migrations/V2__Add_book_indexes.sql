-- ============================================================
-- Flyway Migration: V2__Add_book_indexes.sql
-- Database: booksdb
-- Team:     DB Team
--
-- Performance indexes for books table.
-- Run AFTER V1 (Flyway enforces order).
-- ============================================================

-- Index: search by category (most common filter on Books page)
CREATE INDEX IF NOT EXISTS idx_books_category
    ON books (category)
    WHERE is_active = TRUE;

-- Index: text search on name (for search bar feature)
CREATE INDEX IF NOT EXISTS idx_books_name_lower
    ON books (LOWER(name))
    WHERE is_active = TRUE;

-- Index: text search on author
CREATE INDEX IF NOT EXISTS idx_books_author_lower
    ON books (LOWER(author))
    WHERE is_active = TRUE;

-- Index: sort by created_at (default listing order for card grid)
CREATE INDEX IF NOT EXISTS idx_books_created_at
    ON books (created_at DESC)
    WHERE is_active = TRUE;

-- Index: active books only (partial index — most queries filter is_active=TRUE)
CREATE INDEX IF NOT EXISTS idx_books_active
    ON books (is_active);

-- Index: cost range queries (future price filter feature)
CREATE INDEX IF NOT EXISTS idx_books_cost
    ON books (cost)
    WHERE is_active = TRUE;

-- Composite index: category + created_at (category filter with sort)
CREATE INDEX IF NOT EXISTS idx_books_category_created
    ON books (category, created_at DESC)
    WHERE is_active = TRUE;

COMMENT ON INDEX idx_books_category      IS 'Category filter — used in Books page sidebar';
COMMENT ON INDEX idx_books_name_lower    IS 'Case-insensitive name search';
COMMENT ON INDEX idx_books_author_lower  IS 'Case-insensitive author search';
COMMENT ON INDEX idx_books_created_at    IS 'Default card grid sort order';
