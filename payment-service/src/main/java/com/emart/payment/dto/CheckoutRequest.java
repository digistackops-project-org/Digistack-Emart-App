package com.emart.payment.dto;

import com.emart.payment.model.Order;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.*;

/**
 * POST /api/v1/checkout
 * The frontend sends this after the user completes all checkout steps.
 * Cart items are fetched from Cart Service server-side using the user's JWT.
 */
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class CheckoutRequest {

    @NotNull(message = "Shipping address is required")
    @Valid
    private ShippingAddress shippingAddress;

    @NotNull(message = "Payment method is required")
    private Order.PaymentMethod paymentMethod;

    // Payment details — required fields depend on paymentMethod
    private PaymentDetails paymentDetails;

    private String notes;
}
