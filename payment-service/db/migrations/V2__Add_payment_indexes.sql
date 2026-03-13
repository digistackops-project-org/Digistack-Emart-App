-- ============================================================
-- Flyway Migration: V2__Add_payment_indexes.sql
-- Adds performance indexes for order/payment query patterns.
-- All idempotent (IF NOT EXISTS).
-- ============================================================

-- ── Orders indexes ────────────────────────────────────────────

-- Primary query: get all orders for a user, newest first
CREATE INDEX IF NOT EXISTS idx_orders_user_id_created
    ON orders (user_id, created_at DESC);

-- Look up by human-readable order number (unique constraint already exists)
-- adding index explicitly for query plan
CREATE INDEX IF NOT EXISTS idx_orders_order_number
    ON orders (order_number);

-- Filter by status (e.g. admin dashboard: all PAYMENT_FAILED orders)
CREATE INDEX IF NOT EXISTS idx_orders_status
    ON orders (status)
    WHERE status NOT IN ('DELIVERED', 'CANCELLED', 'REFUNDED');

-- Filter by payment status (e.g. find all PENDING payments for retry logic)
CREATE INDEX IF NOT EXISTS idx_orders_payment_status
    ON orders (payment_status)
    WHERE payment_status IN ('PENDING', 'FAILED');

-- Look up by transaction ID (from payment gateway webhook)
CREATE INDEX IF NOT EXISTS idx_orders_transaction_id
    ON orders (transaction_id)
    WHERE transaction_id IS NOT NULL;

-- Timeline query: orders in a date range (analytics/reporting)
CREATE INDEX IF NOT EXISTS idx_orders_created_at
    ON orders (created_at DESC);

-- Filter by payment method (reporting)
CREATE INDEX IF NOT EXISTS idx_orders_payment_method
    ON orders (payment_method);

-- ── Payments indexes ──────────────────────────────────────────

-- Primary query: all payments for an order (to check history/retries)
CREATE INDEX IF NOT EXISTS idx_payments_order_id_created
    ON payments (order_id, created_at DESC);

-- User's payment history
CREATE INDEX IF NOT EXISTS idx_payments_user_id_created
    ON payments (user_id, created_at DESC);

-- Find by transaction ID (reconciliation)
CREATE INDEX IF NOT EXISTS idx_payments_transaction_id
    ON payments (transaction_id)
    WHERE transaction_id IS NOT NULL;

-- Failed payments audit
CREATE INDEX IF NOT EXISTS idx_payments_status
    ON payments (status)
    WHERE status = 'FAILED';
