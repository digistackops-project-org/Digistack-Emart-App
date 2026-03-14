-- scripts/db/books/check-books.sql
-- Run: sudo -u postgres psql -d booksdb -f scripts/db/check-books.sql
\echo '=== Books DB Status ==='
SELECT count(*) AS total_books FROM books;
SELECT count(*) AS published FROM books WHERE is_active = true;
SELECT title, price, stock FROM books ORDER BY created_at DESC LIMIT 5;
\echo '=== Flyway Migration History ==='
SELECT version, description, installed_on, success
FROM flyway_schema_history ORDER BY installed_rank;
