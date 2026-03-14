-- scripts/db/payment/check-payment.sql
-- Run: sudo -u postgres psql -d paymentdb -f scripts/db/check-payment.sql
\echo '=== Payment DB Status ==='
SELECT count(*) AS total_orders FROM orders;
SELECT count(*) AS total_payments FROM payments;
SELECT order_number, user_email, total_amount, status, created_at
FROM orders ORDER BY created_at DESC LIMIT 10;
\echo '=== Flyway Migration History ==='
SELECT version, description, installed_on, success
FROM flyway_schema_history ORDER BY installed_rank;
