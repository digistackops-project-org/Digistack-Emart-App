-- ============================================================
-- Flyway Migration: V3__Seed_demo_orders.sql
-- Inserts 3 demo orders for the admin@emart.com account.
-- Idempotent: uses ON CONFLICT DO NOTHING on order_number.
-- DEV / QA only — production runs V1+V2 only.
-- ============================================================

-- Only seed if there are no orders yet (prevents re-seeding on re-run)
DO $$
BEGIN
  IF (SELECT COUNT(*) FROM orders) = 0 THEN

    -- ── Order 1: Books — DELIVERED ────────────────────────────
    INSERT INTO orders (
        user_id, user_email, user_name,
        items_json, total_items,
        subtotal, tax_amount, shipping_fee, total_amount,
        status, payment_method, payment_status, transaction_id,
        shipping_address_json, order_number,
        created_at, updated_at, paid_at
    ) VALUES (
        'demo-user-001', 'admin@emart.com', 'Admin User',
        '[{"itemId":"item-1","productId":"book-1","productName":"Clean Code","category":"books","price":499.00,"quantity":1,"subtotal":499.00},{"itemId":"item-2","productId":"book-2","productName":"Design Patterns","category":"books","price":599.00,"quantity":1,"subtotal":599.00}]',
        2,
        1098.00, 197.64, 0.00, 1295.64,
        'DELIVERED', 'UPI', 'SUCCESS', 'UPI-DEMO-ABC123456789',
        '{"fullName":"Admin User","addressLine1":"123 MG Road","city":"Bengaluru","state":"Karnataka","pinCode":"560001","country":"India","phone":"9876543210"}',
        'EM-2024-000001',
        NOW() - INTERVAL '30 days',
        NOW() - INTERVAL '30 days',
        NOW() - INTERVAL '29 days'
    ) ON CONFLICT (order_number) DO NOTHING;

    -- ── Order 2: Course — CONFIRMED ────────────────────────────
    INSERT INTO orders (
        user_id, user_email, user_name,
        items_json, total_items,
        subtotal, tax_amount, shipping_fee, total_amount,
        status, payment_method, payment_status, transaction_id,
        shipping_address_json, order_number,
        created_at, updated_at, paid_at
    ) VALUES (
        'demo-user-001', 'admin@emart.com', 'Admin User',
        '[{"itemId":"item-3","productId":"course-1","productName":"Python Bootcamp — Complete Guide","category":"courses","price":1299.00,"quantity":1,"subtotal":1299.00}]',
        1,
        1299.00, 233.82, 0.00, 1532.82,
        'CONFIRMED', 'CARD', 'SUCCESS', 'CARD-DEMO-DEF456789012',
        '{"fullName":"Admin User","addressLine1":"123 MG Road","city":"Bengaluru","state":"Karnataka","pinCode":"560001","country":"India","phone":"9876543210"}',
        'EM-2024-000002',
        NOW() - INTERVAL '5 days',
        NOW() - INTERVAL '5 days',
        NOW() - INTERVAL '5 days'
    ) ON CONFLICT (order_number) DO NOTHING;

    -- ── Order 3: Mixed — PAYMENT_FAILED ────────────────────────
    INSERT INTO orders (
        user_id, user_email, user_name,
        items_json, total_items,
        subtotal, tax_amount, shipping_fee, total_amount,
        status, payment_method, payment_status,
        shipping_address_json, order_number,
        created_at, updated_at
    ) VALUES (
        'demo-user-001', 'admin@emart.com', 'Admin User',
        '[{"itemId":"item-4","productId":"software-1","productName":"Adobe Creative Cloud","category":"software","price":4999.00,"quantity":1,"subtotal":4999.00}]',
        1,
        4999.00, 899.82, 0.00, 5898.82,
        'PAYMENT_FAILED', 'NET_BANKING', 'FAILED',
        '{"fullName":"Admin User","addressLine1":"123 MG Road","city":"Bengaluru","state":"Karnataka","pinCode":"560001","country":"India","phone":"9876543210"}',
        'EM-2024-000003',
        NOW() - INTERVAL '2 days',
        NOW() - INTERVAL '2 days'
    ) ON CONFLICT (order_number) DO NOTHING;

    -- ── Matching payment records ───────────────────────────────
    INSERT INTO payments (order_id, user_id, amount, currency, method, status, transaction_id, payment_detail, attempt_number, processed_at)
    SELECT id, user_id, total_amount, 'INR', payment_method::VARCHAR::payment_method, 'SUCCESS', transaction_id, 'user@okaxis', 1, paid_at
    FROM orders WHERE order_number = 'EM-2024-000001'
    ON CONFLICT DO NOTHING;

    INSERT INTO payments (order_id, user_id, amount, currency, method, status, transaction_id, payment_detail, attempt_number, processed_at)
    SELECT id, user_id, total_amount, 'INR', payment_method::VARCHAR::payment_method, 'SUCCESS', transaction_id, '**** 4111', 1, paid_at
    FROM orders WHERE order_number = 'EM-2024-000002'
    ON CONFLICT DO NOTHING;

    INSERT INTO payments (order_id, user_id, amount, currency, method, status, failure_reason, payment_detail, attempt_number, processed_at)
    SELECT id, user_id, total_amount, 'INR', payment_method::VARCHAR::payment_method, 'FAILED', 'Net banking session expired', 'State Bank of India', 1, created_at
    FROM orders WHERE order_number = 'EM-2024-000003'
    ON CONFLICT DO NOTHING;

  END IF;
END $$;
