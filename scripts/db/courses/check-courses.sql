-- scripts/db/courses/check-courses.sql
-- Run: sudo -u postgres psql -d coursedb -f scripts/db/check-courses.sql
\echo '=== Courses DB Status ==='
SELECT count(*) AS total_courses FROM courses;
SELECT count(*) AS total_enrollments FROM enrollments;
SELECT title, instructor, price FROM courses ORDER BY created_at DESC LIMIT 5;
\echo '=== Flyway Migration History ==='
SELECT version, description, installed_on, success
FROM flyway_schema_history ORDER BY installed_rank;
