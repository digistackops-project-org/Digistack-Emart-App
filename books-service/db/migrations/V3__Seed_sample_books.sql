-- ============================================================
-- Flyway Migration: V3__Seed_sample_books.sql
-- Database: booksdb
-- Team:     DB Team
--
-- Seeds initial sample books so frontend card grid has data
-- immediately after deployment.
-- Idempotent: uses ON CONFLICT DO NOTHING on isbn.
-- ============================================================

INSERT INTO books (name, author, cost, description, isbn, category, stock, is_active)
VALUES
  (
    'Clean Code: A Handbook of Agile Software Craftsmanship',
    'Robert C. Martin',
    699.00,
    'A handbook of agile software craftsmanship. Filled with wisdom, techniques, and recommended approaches from experts.',
    '978-0132350884',
    'programming',
    50,
    TRUE
  ),
  (
    'The Pragmatic Programmer: Your Journey to Mastery',
    'David Thomas, Andrew Hunt',
    799.00,
    'A classic book that covers software engineering philosophy and practical techniques to become a better programmer.',
    '978-0135957059',
    'programming',
    40,
    TRUE
  ),
  (
    'Design Patterns: Elements of Reusable Object-Oriented Software',
    'Gang of Four',
    899.00,
    'Introduces 23 design patterns for solving common software design problems. Essential for every developer.',
    '978-0201633610',
    'programming',
    30,
    TRUE
  ),
  (
    'System Design Interview: An Insider''s Guide',
    'Alex Xu',
    549.00,
    'Step-by-step framework for tackling system design questions. Covers distributed systems concepts with real examples.',
    '978-1736049112',
    'programming',
    60,
    TRUE
  ),
  (
    'Introduction to Algorithms (CLRS)',
    'Cormen, Leiserson, Rivest, Stein',
    1199.00,
    'The comprehensive reference for algorithms. Covers sorting, graph algorithms, dynamic programming, and more.',
    '978-0262046305',
    'science',
    25,
    TRUE
  ),
  (
    'The Art of Computer Programming Vol. 1',
    'Donald E. Knuth',
    1499.00,
    'The definitive multi-volume work on the analysis of algorithms. A must-have reference for serious programmers.',
    '978-0201896831',
    'science',
    15,
    TRUE
  ),
  (
    'You Don''t Know JS: Scope & Closures',
    'Kyle Simpson',
    399.00,
    'A deep dive into JavaScript''s scope, closures, hoisting, and the module pattern.',
    '978-1491904152',
    'programming',
    45,
    TRUE
  ),
  (
    'Refactoring: Improving the Design of Existing Code',
    'Martin Fowler',
    749.00,
    'A step-by-step guide to restructuring existing code to improve its design without changing external behavior.',
    '978-0134757599',
    'programming',
    35,
    TRUE
  )
ON CONFLICT (isbn) DO NOTHING;

-- Verify seed
DO $$
DECLARE
  book_count INT;
BEGIN
  SELECT COUNT(*) INTO book_count FROM books WHERE is_active = TRUE;
  RAISE NOTICE 'Books table seeded successfully. Total active books: %', book_count;
END;
$$;
