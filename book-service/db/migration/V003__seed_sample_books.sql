-- =============================================================
-- V003__seed_sample_books.sql
-- Seed 10 sample books so the UI is never blank on first launch.
-- Uses INSERT ... ON CONFLICT DO NOTHING so re-runs are safe.
-- =============================================================

INSERT INTO books (name, author, cost, description, category, stock) VALUES
('Clean Code',            'Robert C. Martin',         799.00,  'A handbook of agile software craftsmanship.',              'programming',  50),
('The Pragmatic Programmer', 'Andrew Hunt & David Thomas', 899.00, 'From journeyman to master.',                           'programming',  40),
('Design Patterns',       'Gang of Four',             1199.00, 'Elements of reusable object-oriented software.',           'programming',  30),
('Introduction to Algorithms', 'Thomas H. Cormen',   1499.00, 'Comprehensive textbook covering algorithms. Known as CLRS.','mathematics', 25),
('You Don''t Know JS',    'Kyle Simpson',              599.00, 'Deep dive into JavaScript core mechanisms.',                'programming',  60),
('Refactoring',           'Martin Fowler',             999.00, 'Improving the design of existing code.',                   'programming',  35),
('The Mythical Man-Month', 'Frederick P. Brooks Jr.',  699.00, 'Essays on software engineering and project management.',   'business',     45),
('Domain-Driven Design',  'Eric Evans',               1299.00, 'Tackling complexity in the heart of software.',            'programming',  20),
('Node.js Design Patterns', 'Mario Casciaro',          849.00, 'Most effective design patterns for Node.js apps.',         'programming',  55),
('PostgreSQL: Up and Running', 'Regina Obe & Leo Hsu', 749.00, 'A practical guide to advanced PostgreSQL.',               'science',      40)
ON CONFLICT (name, author) DO NOTHING;
