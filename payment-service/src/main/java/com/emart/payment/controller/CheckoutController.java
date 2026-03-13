package com.emart.payment.controller;

import com.emart.payment.dto.*;
import com.emart.payment.security.JwtService;
import com.emart.payment.service.CheckoutService;
import io.jsonwebtoken.Claims;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

/**
 * POST /api/v1/checkout         — create order from cart
 * POST /api/v1/payments/{id}/process — process payment
 * GET  /api/v1/orders           — list user orders
 * GET  /api/v1/orders/{id}      — get order by ID
 */
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Slf4j
public class CheckoutController {

    private final CheckoutService checkoutService;

    // ── Helper: extract Claims from Security context ───────────
    private Claims getClaims() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getDetails() instanceof Claims claims) {
            return claims;
        }
        throw new IllegalStateException("No JWT claims in security context");
    }

    private String extractJwt(HttpServletRequest request) {
        String h = request.getHeader("Authorization");
        return h != null && h.startsWith("Bearer ") ? h.substring(7) : "";
    }

    // ============================================================
    //  POST /api/v1/checkout
    //  Step 1: Create order from current cart contents + shipping + payment method
    // ============================================================
    @PostMapping("/checkout")
    public ResponseEntity<ApiResponse<OrderResponse>> checkout(
            @Valid @RequestBody CheckoutRequest request,
            HttpServletRequest httpRequest) {
        try {
            String jwtToken   = extractJwt(httpRequest);
            Claims claims     = getClaims();
            OrderResponse order = checkoutService.checkout(request, claims, jwtToken);
            return ResponseEntity.status(201)
                .body(ApiResponse.ok(order, "Order created. Proceed to payment."));
        } catch (IllegalStateException ex) {
            return ResponseEntity.badRequest()
                .body(ApiResponse.fail(ex.getMessage()));
        } catch (Exception ex) {
            log.error("Checkout error", ex);
            return ResponseEntity.internalServerError()
                .body(ApiResponse.fail("Checkout failed. Please try again."));
        }
    }

    // ============================================================
    //  POST /api/v1/payments/{orderId}/process
    //  Step 2: Process payment for a pending order
    // ============================================================
    @PostMapping("/payments/{orderId}/process")
    public ResponseEntity<ApiResponse<PaymentResult>> processPayment(
            @PathVariable Long orderId,
            @RequestBody(required = false) String paymentDetails,
            HttpServletRequest httpRequest) {
        try {
            String jwtToken = extractJwt(httpRequest);
            Claims claims   = getClaims();
            PaymentResult result = checkoutService.processPayment(
                orderId, paymentDetails, claims, jwtToken);

            int statusCode = result.getPaymentStatus().name().equals("SUCCESS") ? 200 : 402;
            return ResponseEntity.status(statusCode)
                .body(ApiResponse.ok(result, result.getMessage()));

        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(404)
                .body(ApiResponse.fail(ex.getMessage()));
        } catch (IllegalStateException ex) {
            return ResponseEntity.badRequest()
                .body(ApiResponse.fail(ex.getMessage()));
        } catch (Exception ex) {
            log.error("Payment processing error for order {}", orderId, ex);
            return ResponseEntity.internalServerError()
                .body(ApiResponse.fail("Payment processing failed. Please try again."));
        }
    }

    // ============================================================
    //  GET /api/v1/orders
    //  Returns all orders for the authenticated user (newest first)
    // ============================================================
    @GetMapping("/orders")
    public ResponseEntity<ApiResponse<List<OrderResponse>>> getOrders() {
        try {
            Claims claims         = getClaims();
            List<OrderResponse> orders = checkoutService.getOrders(claims);
            return ResponseEntity.ok(
                ApiResponse.ok(orders, orders.size() + " orders retrieved"));
        } catch (Exception ex) {
            log.error("Error fetching orders", ex);
            return ResponseEntity.internalServerError()
                .body(ApiResponse.fail("Failed to fetch orders"));
        }
    }

    // ============================================================
    //  GET /api/v1/orders/{orderId}
    //  Returns a single order. Only the owning user can access it.
    // ============================================================
    @GetMapping("/orders/{orderId}")
    public ResponseEntity<ApiResponse<OrderResponse>> getOrder(
            @PathVariable Long orderId) {
        try {
            Claims claims       = getClaims();
            OrderResponse order = checkoutService.getOrder(orderId, claims);
            return ResponseEntity.ok(ApiResponse.ok(order, "Order retrieved"));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(404)
                .body(ApiResponse.fail(ex.getMessage()));
        } catch (Exception ex) {
            log.error("Error fetching order {}", orderId, ex);
            return ResponseEntity.internalServerError()
                .body(ApiResponse.fail("Failed to fetch order"));
        }
    }
}
