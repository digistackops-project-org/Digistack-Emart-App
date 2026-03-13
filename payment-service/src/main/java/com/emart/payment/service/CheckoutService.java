package com.emart.payment.service;

import com.emart.payment.dto.*;
import com.emart.payment.model.Order;
import com.emart.payment.model.Payment;
import com.emart.payment.repository.OrderRepository;
import com.emart.payment.repository.PaymentRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.jsonwebtoken.Claims;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class CheckoutService {

    private final OrderRepository            orderRepository;
    private final PaymentRepository          paymentRepository;
    private final CartServiceClient          cartClient;
    private final PaymentProcessorService    paymentProcessor;
    private final NotificationServiceClient  notificationClient;   // Phase 9
    private final ObjectMapper               objectMapper;

    private static final BigDecimal TAX_RATE           = new BigDecimal("0.18"); // 18% GST
    private static final BigDecimal FREE_SHIPPING_ABOVE = new BigDecimal("999"); // free above ₹999
    private static final BigDecimal SHIPPING_FEE        = new BigDecimal("49");   // ₹49 flat

    // ============================================================
    //  1. POST /api/v1/checkout — Create order from cart
    // ============================================================
    @Transactional
    public OrderResponse checkout(CheckoutRequest request, Claims claims, String jwtToken) {
        String userId    = claims.get("userId", String.class);
        String userEmail = claims.getSubject();
        String userName  = claims.get("name", String.class);

        // a) Fetch cart items from Cart Service
        List<CartItemSnapshot> cartItems = cartClient.fetchCartItems(jwtToken);
        if (cartItems.isEmpty()) {
            throw new IllegalStateException(
                "Your cart is empty or Cart Service is unavailable. " +
                "Please add items and try again."
            );
        }

        // b) Calculate amounts
        BigDecimal subtotal = cartItems.stream()
            .map(CartItemSnapshot::getSubtotal)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal taxAmount   = subtotal.multiply(TAX_RATE).setScale(2, RoundingMode.HALF_UP);
        BigDecimal shippingFee = subtotal.compareTo(FREE_SHIPPING_ABOVE) >= 0
            ? BigDecimal.ZERO : SHIPPING_FEE;
        BigDecimal totalAmount = subtotal.add(taxAmount).add(shippingFee);

        // c) Serialize items for storage
        String itemsJson;
        try {
            itemsJson = objectMapper.writeValueAsString(cartItems);
        } catch (Exception e) {
            throw new RuntimeException("Failed to serialise cart items", e);
        }

        String shippingJson;
        try {
            shippingJson = objectMapper.writeValueAsString(request.getShippingAddress());
        } catch (Exception e) {
            throw new RuntimeException("Failed to serialise shipping address", e);
        }

        // d) Generate human-readable order number
        long orderSeq  = orderRepository.countAll() + 1;
        String orderNo = String.format("EM-%d-%06d",
            java.time.LocalDate.now().getYear(), orderSeq);

        // e) Persist order with PENDING status
        Order order = Order.builder()
            .userId(userId)
            .userEmail(userEmail)
            .userName(userName)
            .itemsJson(itemsJson)
            .totalItems(cartItems.stream().mapToInt(CartItemSnapshot::getQuantity).sum())
            .subtotal(subtotal)
            .taxAmount(taxAmount)
            .shippingFee(shippingFee)
            .totalAmount(totalAmount)
            .status(Order.OrderStatus.PENDING)
            .shippingAddressJson(shippingJson)
            .paymentMethod(request.getPaymentMethod())
            .paymentStatus(Order.PaymentStatus.PENDING)
            .orderNumber(orderNo)
            .notes(request.getNotes())
            .build();

        order = orderRepository.save(order);
        log.info("Order {} created for user {} — total ₹{}", orderNo, userEmail, totalAmount);

        return toResponse(order, cartItems);
    }

    // ============================================================
    //  2. POST /api/v1/payments/{orderId}/process — Process payment
    // ============================================================
    @Transactional
    public PaymentResult processPayment(Long orderId, String paymentDetailStr,
                                        Claims claims, String jwtToken) {
        String userId = claims.get("userId", String.class);

        Order order = orderRepository.findByIdAndUserId(orderId, userId)
            .orElseThrow(() -> new NoSuchElementException("Order " + orderId + " not found"));

        if (order.getPaymentStatus() == Order.PaymentStatus.SUCCESS) {
            throw new IllegalStateException("Order " + order.getOrderNumber() + " is already paid");
        }

        // Determine attempt number
        int attemptNumber = paymentRepository.countByOrderId(orderId) + 1;

        // Build details map from string (or empty)
        Map<String, String> detailsMap = new HashMap<>();
        if (paymentDetailStr != null && !paymentDetailStr.isBlank()) {
            detailsMap.put("cardNumber",  extractField(paymentDetailStr, "cardNumber"));
            detailsMap.put("upiId",       extractField(paymentDetailStr, "upiId"));
            detailsMap.put("bankName",    extractField(paymentDetailStr, "bankName"));
            detailsMap.put("walletType",  extractField(paymentDetailStr, "walletType"));
        }

        // Call payment processor (simulated or real gateway)
        PaymentProcessorService.GatewayResult result = paymentProcessor.process(
            order.getPaymentMethod(),
            order.getTotalAmount(),
            "INR",
            detailsMap
        );

        // Persist payment record
        Payment payment = Payment.builder()
            .orderId(orderId)
            .userId(userId)
            .amount(order.getTotalAmount())
            .currency("INR")
            .method(order.getPaymentMethod())
            .status(result.success() ? Order.PaymentStatus.SUCCESS : Order.PaymentStatus.FAILED)
            .transactionId(result.transactionId())
            .gatewayResponse(result.gatewayResponseJson())
            .paymentDetail(result.maskedDetail())
            .failureReason(result.failureReason())
            .attemptNumber(attemptNumber)
            .processedAt(Instant.now())
            .build();

        payment = paymentRepository.save(payment);

        // Update order status
        if (result.success()) {
            order.setPaymentStatus(Order.PaymentStatus.SUCCESS);
            order.setStatus(Order.OrderStatus.CONFIRMED);
            order.setTransactionId(result.transactionId());
            order.setPaidAt(Instant.now());
            orderRepository.save(order);

            // Clear cart (async, non-blocking — order success is already committed)
            cartClient.clearCart(jwtToken);

            // Send order confirmation email (fire-and-forget — never blocks order response)
            ShippingAddress addr = null;
            if (order.getShippingAddressJson() != null) {
                try { addr = objectMapper.readValue(order.getShippingAddressJson(), ShippingAddress.class); }
                catch (Exception ignored) {}
            }
            notificationClient.sendOrderConfirmed(order, cartItems, addr);

            log.info("Payment SUCCESS for order {} — txn {}", order.getOrderNumber(), result.transactionId());
        } else {
            order.setPaymentStatus(Order.PaymentStatus.FAILED);
            order.setStatus(Order.OrderStatus.PAYMENT_FAILED);
            orderRepository.save(order);

            // Send payment failure email (fire-and-forget)
            notificationClient.sendOrderFailed(order);

            log.warn("Payment FAILED for order {} — reason: {}", order.getOrderNumber(), result.failureReason());
        }

        return PaymentResult.builder()
            .paymentId(payment.getId())
            .transactionId(result.transactionId())
            .paymentStatus(payment.getStatus())
            .orderStatus(order.getStatus())
            .orderNumber(order.getOrderNumber())
            .message(result.success()
                ? "Payment successful! Your order " + order.getOrderNumber() + " is confirmed."
                : "Payment failed: " + result.failureReason())
            .processedAt(payment.getProcessedAt())
            .build();
    }

    // ============================================================
    //  3. GET /api/v1/orders — List user orders
    // ============================================================
    public List<OrderResponse> getOrders(Claims claims) {
        String userId = claims.get("userId", String.class);
        return orderRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
            .map(o -> toResponse(o, null))
            .collect(Collectors.toList());
    }

    // ============================================================
    //  4. GET /api/v1/orders/{orderId} — Get single order
    // ============================================================
    public OrderResponse getOrder(Long orderId, Claims claims) {
        String userId = claims.get("userId", String.class);
        Order order = orderRepository.findByIdAndUserId(orderId, userId)
            .orElseThrow(() -> new NoSuchElementException("Order " + orderId + " not found"));
        return toResponse(order, null);
    }

    // ── Helpers ───────────────────────────────────────────────
    private OrderResponse toResponse(Order order, List<CartItemSnapshot> items) {
        // Deserialize stored items if not provided
        if (items == null && order.getItemsJson() != null) {
            try {
                items = objectMapper.readValue(order.getItemsJson(),
                    new TypeReference<List<CartItemSnapshot>>() {});
            } catch (Exception e) {
                log.warn("Could not deserialise items for order {}", order.getId());
                items = List.of();
            }
        }

        ShippingAddress addr = null;
        if (order.getShippingAddressJson() != null) {
            try {
                addr = objectMapper.readValue(order.getShippingAddressJson(), ShippingAddress.class);
            } catch (Exception e) {
                log.warn("Could not deserialise shipping address for order {}", order.getId());
            }
        }

        return OrderResponse.builder()
            .id(order.getId())
            .orderNumber(order.getOrderNumber())
            .userId(order.getUserId())
            .userEmail(order.getUserEmail())
            .items(items)
            .totalItems(order.getTotalItems())
            .subtotal(order.getSubtotal())
            .taxAmount(order.getTaxAmount())
            .shippingFee(order.getShippingFee())
            .totalAmount(order.getTotalAmount())
            .status(order.getStatus())
            .shippingAddress(addr)
            .paymentMethod(order.getPaymentMethod())
            .paymentStatus(order.getPaymentStatus())
            .transactionId(order.getTransactionId())
            .notes(order.getNotes())
            .createdAt(order.getCreatedAt())
            .updatedAt(order.getUpdatedAt())
            .paidAt(order.getPaidAt())
            .build();
    }

    private String extractField(String detailStr, String field) {
        try {
            com.fasterxml.jackson.databind.JsonNode node = objectMapper.readTree(detailStr);
            com.fasterxml.jackson.databind.JsonNode val  = node.get(field);
            return val != null && !val.isNull() ? val.asText() : "";
        } catch (Exception e) {
            return "";
        }
    }
}
