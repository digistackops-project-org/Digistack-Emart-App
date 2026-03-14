-- scripts/db/profile/check-profile.sql
-- Run: sudo -u postgres psql -d profiledb -f scripts/db/check-profile.sql
\echo '=== Profile DB Status ==='
SELECT count(*) AS total_profiles FROM user_profiles;
SELECT count(*) AS total_addresses FROM user_addresses;
SELECT id, email, name, phone, created_at
FROM user_profiles ORDER BY created_at DESC LIMIT 10;
