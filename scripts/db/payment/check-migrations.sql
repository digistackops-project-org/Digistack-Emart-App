-- =============================================================
-- scripts/db/payment/check-migrations.sql
-- Payment Service — DB migration health check script
--
-- Run:  psql -U emart_payment -d paymentdb -f check-migrations.sql
--       psql -h localhost -U emart_payment -d paymentdb -f check-migrations.sql
--
-- Used by: DB Team during QA, UAT, and Production deployments
-- =============================================================

\echo '============================================='
\echo ' Emart paymentdb — Migration Health Check'
\echo '============================================='

-- ── 1. Flyway migration history ───────────────────────────────
\echo ''
\echo '--- Flyway Migration History ---'
SELECT
    installed_rank   AS "Rank",
    version          AS "Version",
    description      AS "Description",
    type             AS "Type",
    installed_on     AS "Applied At",
    execution_time   AS "ms",
    CASE WHEN success THEN '✅ OK' ELSE '❌ FAILED' END AS "Status"
FROM flyway_schema_history
ORDER BY installed_rank;

-- ── 2. Failed migrations (should be empty in healthy state) ───
\echo ''
\echo '--- Failed Migrations (should be empty) ---'
SELECT version, description, installed_on
FROM flyway_schema_history
WHERE success = FALSE;

-- ── 3. Table summary ──────────────────────────────────────────
\echo ''
\echo '--- Tables ---'
SELECT
    tablename AS "Table",
    pg_size_pretty(pg_total_relation_size(quote_ident(tablename))) AS "Size"
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- ── 4. Index count ────────────────────────────────────────────
\echo ''
\echo '--- Indexes ---'
SELECT
    tablename AS "Table",
    indexname AS "Index"
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('orders', 'payments')
ORDER BY tablename, indexname;

-- ── 5. Order counts by status ─────────────────────────────────
\echo ''
\echo '--- Order Counts by Status ---'
SELECT
    status          AS "Status",
    payment_status  AS "Payment",
    COUNT(*)        AS "Count"
FROM orders
GROUP BY status, payment_status
ORDER BY status;

-- ── 6. Recent orders (last 10) ───────────────────────────────
\echo ''
\echo '--- Recent Orders (last 10) ---'
SELECT
    order_number      AS "Order No.",
    user_email        AS "User",
    total_amount      AS "Amount (₹)",
    status            AS "Status",
    payment_status    AS "Payment",
    created_at::date  AS "Date"
FROM orders
ORDER BY created_at DESC
LIMIT 10;

-- ── 7. Payment attempts summary ───────────────────────────────
\echo ''
\echo '--- Payment Attempts ---'
SELECT
    status      AS "Status",
    method      AS "Method",
    COUNT(*)    AS "Count"
FROM payments
GROUP BY status, method
ORDER BY status, method;

\echo ''
\echo '============================================='
\echo ' Check complete'
\echo '============================================='
