package com.emart.payment.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/**
 * Order entity — persisted in paymentdb.orders.
 * One order per checkout attempt.
 * Items stored as JSON (no separate order_items table needed at this scale).
 */
@Entity
@Table(name = "orders")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ── Who placed the order ──────────────────────────────────
    @Column(name = "user_id",    nullable = false, length = 100)
    private String userId;

    @Column(name = "user_email", nullable = false, length = 255)
    private String userEmail;

    @Column(name = "user_name",  length = 255)
    private String userName;

    // ── Items snapshot (from Cart Service at checkout time) ───
    @Column(name = "items_json", nullable = false, columnDefinition = "jsonb")
    private String itemsJson;

    @Column(name = "total_items", nullable = false)
    @Builder.Default
    private Integer totalItems = 0;

    // ── Amounts ───────────────────────────────────────────────
    @Column(name = "subtotal",     nullable = false, precision = 12, scale = 2)
    private BigDecimal subtotal;

    @Column(name = "tax_amount",   nullable = false, precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal taxAmount = BigDecimal.ZERO;

    @Column(name = "shipping_fee", nullable = false, precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal shippingFee = BigDecimal.ZERO;

    @Column(name = "total_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal totalAmount;

    // ── Order status ──────────────────────────────────────────
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    @Builder.Default
    private OrderStatus status = OrderStatus.PENDING;

    // ── Shipping address (JSON snapshot) ─────────────────────
    @Column(name = "shipping_address_json", nullable = false, columnDefinition = "jsonb")
    private String shippingAddressJson;

    // ── Payment info ──────────────────────────────────────────
    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method", nullable = false, length = 30)
    private PaymentMethod paymentMethod;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_status", nullable = false, length = 30)
    @Builder.Default
    private PaymentStatus paymentStatus = PaymentStatus.PENDING;

    @Column(name = "transaction_id", length = 100)
    private String transactionId;

    // ── Order number (human-readable) ────────────────────────
    @Column(name = "order_number", nullable = false, unique = true, length = 30)
    private String orderNumber;     // e.g. EM-2024-000001

    @Column(name = "notes", length = 500)
    private String notes;

    // ── Timestamps ────────────────────────────────────────────
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "paid_at")
    private Instant paidAt;

    // ── Enums ─────────────────────────────────────────────────
    public enum OrderStatus {
        PENDING, CONFIRMED, PROCESSING, SHIPPED, DELIVERED, CANCELLED, PAYMENT_FAILED, REFUNDED
    }

    public enum PaymentStatus {
        PENDING, SUCCESS, FAILED, REFUNDED
    }

    public enum PaymentMethod {
        COD, UPI, CARD, NET_BANKING, WALLET
    }
}
