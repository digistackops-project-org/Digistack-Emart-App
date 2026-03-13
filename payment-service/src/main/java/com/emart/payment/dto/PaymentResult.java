package com.emart.payment.dto;

import com.emart.payment.model.Order;
import lombok.*;
import java.time.Instant;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class PaymentResult {
    private Long paymentId;
    private String transactionId;
    private Order.PaymentStatus paymentStatus;
    private Order.OrderStatus orderStatus;
    private String orderNumber;
    private String message;
    private Instant processedAt;
}
