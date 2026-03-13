package com.emart.payment.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * Payment attempt record.
 * One payment record per POST /api/v1/payments/{orderId}/process call.
 * Multiple attempts allowed (retries on failure).
 */
@Entity
@Table(name = "payments")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "order_id",   nullable = false)
    private Long orderId;

    @Column(name = "user_id",    nullable = false, length = 100)
    private String userId;

    @Column(name = "amount",     nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Column(name = "currency",   nullable = false, length = 10)
    @Builder.Default
    private String currency = "INR";

    @Enumerated(EnumType.STRING)
    @Column(name = "method",     nullable = false, length = 30)
    private Order.PaymentMethod method;

    @Enumerated(EnumType.STRING)
    @Column(name = "status",     nullable = false, length = 30)
    @Builder.Default
    private Order.PaymentStatus status = Order.PaymentStatus.PENDING;

    // Transaction ID from payment gateway (simulated UUID in this phase)
    @Column(name = "transaction_id", length = 100)
    private String transactionId;

    // Raw response from gateway — stored for audit
    @Column(name = "gateway_response", columnDefinition = "jsonb")
    private String gatewayResponse;

    // Payment details (masked card number, UPI ID, bank name, etc.)
    @Column(name = "payment_detail", length = 255)
    private String paymentDetail;

    @Column(name = "failure_reason", length = 500)
    private String failureReason;

    @Column(name = "attempt_number", nullable = false)
    @Builder.Default
    private Integer attemptNumber = 1;

    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "processed_at")
    private Instant processedAt;
}
