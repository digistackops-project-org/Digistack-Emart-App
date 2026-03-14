-- ============================================================
-- Flyway Migration: V1__Create_orders_payments_tables.sql
-- Database:  paymentdb (PostgreSQL)
-- Team:      DB Team
-- Phase:     5 — Payment / Checkout Service
--
-- Creates two core tables:
--   orders   — one row per checkout attempt
--   payments — one row per payment gateway call (retries allowed)
-- ============================================================

-- ── ENUM types ────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE order_status AS ENUM (
    'PENDING','CONFIRMED','PROCESSING','SHIPPED',
    'DELIVERED','CANCELLED','PAYMENT_FAILED','REFUNDED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('PENDING','SUCCESS','FAILED','REFUNDED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM ('COD','UPI','CARD','NET_BANKING','WALLET');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── ORDERS table ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
    -- Primary key
    id                      BIGSERIAL               PRIMARY KEY,

    -- Who placed the order
    user_id                 VARCHAR(100)            NOT NULL,
    user_email              VARCHAR(255)            NOT NULL,
    user_name               VARCHAR(255),

    -- Items snapshot from Cart Service at checkout time (JSONB)
    items_json              JSONB                   NOT NULL,
    total_items             INTEGER                 NOT NULL    DEFAULT 0
                                CHECK (total_items >= 0),

    -- Amounts (INR)
    subtotal                DECIMAL(12,2)           NOT NULL    CHECK (subtotal >= 0),
    tax_amount              DECIMAL(10,2)           NOT NULL    DEFAULT 0.00,
    shipping_fee            DECIMAL(10,2)           NOT NULL    DEFAULT 0.00,
    total_amount            DECIMAL(12,2)           NOT NULL    CHECK (total_amount >= 0),

    -- Order lifecycle
    status                  VARCHAR(30)             NOT NULL    DEFAULT 'PENDING'
                                CHECK (status IN (
                                  'PENDING','CONFIRMED','PROCESSING','SHIPPED',
                                  'DELIVERED','CANCELLED','PAYMENT_FAILED','REFUNDED'
                                )),

    -- Shipping address snapshot (JSONB)
    shipping_address_json   JSONB                   NOT NULL,

    -- Payment info
    payment_method          VARCHAR(30)             NOT NULL
                                CHECK (payment_method IN ('COD','UPI','CARD','NET_BANKING','WALLET')),
    payment_status          VARCHAR(30)             NOT NULL    DEFAULT 'PENDING'
                                CHECK (payment_status IN ('PENDING','SUCCESS','FAILED','REFUNDED')),
    transaction_id          VARCHAR(100),

    -- Human-readable order number shown to user (e.g. EM-2024-000001)
    order_number            VARCHAR(30)             NOT NULL    UNIQUE,

    notes                   VARCHAR(500),

    -- Timestamps (UTC)
    created_at              TIMESTAMP WITH TIME ZONE            DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE            DEFAULT NOW(),
    paid_at                 TIMESTAMP WITH TIME ZONE
);

-- Auto-update updated_at on every UPDATE
CREATE OR REPLACE FUNCTION update_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_orders_updated_at();

-- ── PAYMENTS table ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
    id                  BIGSERIAL               PRIMARY KEY,

    order_id            BIGINT                  NOT NULL REFERENCES orders(id),
    user_id             VARCHAR(100)            NOT NULL,

    amount              DECIMAL(12,2)           NOT NULL CHECK (amount > 0),
    currency            VARCHAR(10)             NOT NULL DEFAULT 'INR',

    method              VARCHAR(30)             NOT NULL
                            CHECK (method IN ('COD','UPI','CARD','NET_BANKING','WALLET')),
    status              VARCHAR(30)             NOT NULL DEFAULT 'PENDING'
                            CHECK (status IN ('PENDING','SUCCESS','FAILED','REFUNDED')),

    transaction_id      VARCHAR(100),

    -- Raw gateway response — stored for audit/disputes
    gateway_response    JSONB,

    -- Masked payment detail (e.g. "**** 4242", "user@okaxis", "HDFC")
    payment_detail      VARCHAR(255),

    failure_reason      VARCHAR(500),
    attempt_number      INTEGER                 NOT NULL DEFAULT 1 CHECK (attempt_number >= 1),
    ip_address          VARCHAR(45),

    created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at        TIMESTAMP WITH TIME ZONE
);

CREATE TRIGGER payments_updated_at
    BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_orders_updated_at();

-- ── Column documentation ──────────────────────────────────────
COMMENT ON TABLE  orders                      IS 'Emart checkout orders — one row per cart checkout';
COMMENT ON COLUMN orders.items_json           IS 'Cart item snapshot at checkout time — never changes after creation';
COMMENT ON COLUMN orders.shipping_address_json IS 'Shipping address snapshot — jsonb for flexibility';
COMMENT ON COLUMN orders.order_number         IS 'Human-readable ID shown to user: EM-YYYY-NNNNNN';
COMMENT ON COLUMN orders.total_amount         IS 'subtotal + tax_amount + shipping_fee in INR';
COMMENT ON TABLE  payments                    IS 'Payment gateway call records — multiple per order allowed (retries)';
COMMENT ON COLUMN payments.gateway_response   IS 'Raw response from payment gateway — stored for audit trail';
COMMENT ON COLUMN payments.payment_detail     IS 'Masked safe-to-store detail: last 4 card digits, UPI ID, bank name';
