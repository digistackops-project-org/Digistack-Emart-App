-- ============================================================
-- Flyway Migration: V3__Seed_sample_courses.sql
-- Database:  coursedb
-- Team:      DB Team
--
-- Seeds 10 sample courses so the frontend card grid
-- has real content immediately after first deployment.
-- Idempotent: INSERT ... ON CONFLICT DO NOTHING.
-- Uses a unique constraint on (name, author) for idempotency.
-- ============================================================

-- Temporary unique constraint for seed idempotency
ALTER TABLE courses
    ADD CONSTRAINT IF NOT EXISTS courses_name_author_unique UNIQUE (name, author);

-- ── Insert sample courses ─────────────────────────────────────
INSERT INTO courses (name, author, cost, description, category, duration_hours, level, stock, is_active)
VALUES
  (
    'Complete Python Bootcamp: From Zero to Hero',
    'Jose Portilla',
    499.00,
    'Learn Python like a professional. Start from the basics and go all the way to creating your own applications and games.',
    'programming', 22, 'beginner', 200, TRUE
  ),
  (
    'The Web Developer Bootcamp 2024',
    'Colt Steele',
    599.00,
    'The only course you need to become a full-stack web developer. HTML, CSS, JavaScript, Node, React, and more.',
    'programming', 67, 'beginner', 150, TRUE
  ),
  (
    'Machine Learning A-Z: AI, Python & R',
    'Kirill Eremenko',
    799.00,
    'Learn to create Machine Learning algorithms in Python and R from two Data Science experts. Complete beginner to advanced.',
    'data-science', 44, 'intermediate', 120, TRUE
  ),
  (
    'React - The Complete Guide (including React Router & Redux)',
    'Maximilian Schwarzmuller',
    649.00,
    'Dive in and learn React from scratch! Learn Reactjs, Hooks, Redux, React Router, Next.js, Best Practices, and way more!',
    'programming', 49, 'intermediate', 180, TRUE
  ),
  (
    'Data Science and Machine Learning with Python',
    'Frank Kane',
    549.00,
    'Hands-on data science and machine learning. Matplotlib, Seaborn, Scikit-Learn, TensorFlow, and Keras.',
    'data-science', 14, 'intermediate', 90, TRUE
  ),
  (
    'UI/UX Design Bootcamp',
    'Daniel Scott',
    699.00,
    'Become a UX/UI designer. Learn to design websites and mobile apps. Complete beginner to advanced design skills.',
    'design', 36, 'beginner', 80, TRUE
  ),
  (
    'Kubernetes for the Absolute Beginners',
    'Mumshad Mannambeth',
    449.00,
    'Learn Kubernetes in easy steps with hands-on coding exercises. For complete beginners to DevOps and containers.',
    'programming', 6, 'beginner', 250, TRUE
  ),
  (
    'The Complete SQL Bootcamp: Go from Zero to Hero',
    'Jose Portilla',
    399.00,
    'Become an expert at SQL! Learn SQL using PostgreSQL including pgAdmin. Gain a portfolio of SQL skills.',
    'programming', 9, 'beginner', 300, TRUE
  ),
  (
    'Statistics and Probability for Data Science',
    'Mike X Cohen',
    499.00,
    'Learn the fundamentals of statistics and probability as applied to data science, machine learning, and AI.',
    'mathematics', 18, 'intermediate', 70, TRUE
  ),
  (
    'Business Fundamentals: Entrepreneurship for Beginners',
    'Chris Haroun',
    349.00,
    'Learn the fundamentals of business. How to start and run a business using real-world examples and practical tips.',
    'business', 7, 'beginner', 60, TRUE
  )
ON CONFLICT (name, author) DO NOTHING;

-- ── Verify seed ───────────────────────────────────────────────
DO $$
DECLARE
    total_courses INT;
    active_courses INT;
BEGIN
    SELECT COUNT(*) INTO total_courses FROM courses;
    SELECT COUNT(*) INTO active_courses FROM courses WHERE is_active = TRUE;
    RAISE NOTICE 'Courses seed complete. Total: %, Active: %', total_courses, active_courses;
END;
$$;
