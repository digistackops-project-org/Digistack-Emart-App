-- =============================================================
-- V002__add_indexes_and_trigger.sql
-- Performance indexes + auto-updated updated_at trigger
-- =============================================================

-- Speed up lookups by title (partial case-insensitive)
CREATE INDEX IF NOT EXISTS idx_books_title_lower  ON books (LOWER(title));

-- Speed up lookups by author
CREATE INDEX IF NOT EXISTS idx_books_author_lower ON books (LOWER(author));

-- Speed up cost-range queries (e.g. "books under ₹500")
CREATE INDEX IF NOT EXISTS idx_books_cost         ON books (cost);

-- Sort-by-newest queries
CREATE INDEX IF NOT EXISTS idx_books_created_at   ON books (created_at DESC);

-- ── Auto-update updated_at on every row change ────────────────
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_books_updated_at ON books;

CREATE TRIGGER trg_books_updated_at
    BEFORE UPDATE ON books
    FOR EACH ROW
    EXECUTE FUNCTION fn_set_updated_at();
