package com.emart.payment.dto;

import com.emart.payment.model.Order;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class OrderResponse {
    private Long id;
    private String orderNumber;
    private String userId;
    private String userEmail;
    private List<CartItemSnapshot> items;
    private Integer totalItems;
    private BigDecimal subtotal;
    private BigDecimal taxAmount;
    private BigDecimal shippingFee;
    private BigDecimal totalAmount;
    private Order.OrderStatus status;
    private ShippingAddress shippingAddress;
    private Order.PaymentMethod paymentMethod;
    private Order.PaymentStatus paymentStatus;
    private String transactionId;
    private String notes;
    private Instant createdAt;
    private Instant updatedAt;
    private Instant paidAt;
}
