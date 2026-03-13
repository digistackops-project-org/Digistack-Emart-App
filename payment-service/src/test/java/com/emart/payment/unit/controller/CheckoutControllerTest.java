package com.emart.payment.unit.controller;

import com.emart.payment.controller.CheckoutController;
import com.emart.payment.dto.*;
import com.emart.payment.model.Order;
import com.emart.payment.security.JwtService;
import com.emart.payment.service.CheckoutService;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.impl.DefaultClaims;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(CheckoutController.class)
@Tag("unit")
class CheckoutControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;

    @MockBean CheckoutService checkoutService;
    @MockBean JwtService      jwtService;

    private static final String VALID_JWT = "Bearer valid.jwt.token";

    // ── Helpers ───────────────────────────────────────────────
    private CheckoutRequest buildValidRequest() {
        ShippingAddress addr = ShippingAddress.builder()
            .fullName("Test User")
            .addressLine1("123 MG Road")
            .city("Bengaluru")
            .state("Karnataka")
            .pinCode("560001")
            .country("India")
            .phone("9876543210")
            .build();
        return CheckoutRequest.builder()
            .shippingAddress(addr)
            .paymentMethod(Order.PaymentMethod.UPI)
            .paymentDetails(PaymentDetails.builder().upiId("test@upi").build())
            .build();
    }

    private OrderResponse buildOrderResponse() {
        return OrderResponse.builder()
            .id(1L)
            .orderNumber("EM-2024-000001")
            .userId("user-001")
            .userEmail("test@emart.com")
            .totalItems(2)
            .subtotal(new BigDecimal("1098.00"))
            .taxAmount(new BigDecimal("197.64"))
            .shippingFee(BigDecimal.ZERO)
            .totalAmount(new BigDecimal("1295.64"))
            .status(Order.OrderStatus.PENDING)
            .paymentMethod(Order.PaymentMethod.UPI)
            .paymentStatus(Order.PaymentStatus.PENDING)
            .createdAt(Instant.now())
            .updatedAt(Instant.now())
            .build();
    }

    // ── Health endpoints (no auth) ─────────────────────────────
    @Test
    @DisplayName("GET /health → 200 UP (no auth required)")
    void health_noAuth_returns200() throws Exception {
        mockMvc.perform(get("/health"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("UP"));
    }

    @Test
    @DisplayName("GET /health/live → 200 UP (no auth)")
    void healthLive_noAuth_returns200() throws Exception {
        mockMvc.perform(get("/health/live"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.probe").value("liveness"));
    }

    // ── Auth checks ───────────────────────────────────────────
    @Test
    @DisplayName("POST /api/v1/checkout without token → 401")
    void checkout_noAuth_returns401() throws Exception {
        mockMvc.perform(post("/api/v1/checkout")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(buildValidRequest())))
            .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("GET /api/v1/orders without token → 401")
    void orders_noAuth_returns401() throws Exception {
        mockMvc.perform(get("/api/v1/orders"))
            .andExpect(status().isUnauthorized());
    }

    // ── Checkout validation ────────────────────────────────────
    @Test
    @DisplayName("POST /api/v1/checkout with missing address → 400")
    @WithMockUser
    void checkout_missingAddress_returns400() throws Exception {
        CheckoutRequest req = CheckoutRequest.builder()
            .paymentMethod(Order.PaymentMethod.UPI)
            .build();  // no shippingAddress

        mockMvc.perform(post("/api/v1/checkout")
            .with(SecurityMockMvcRequestPostProcessors.csrf())
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(req)))
            .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("POST /api/v1/checkout with invalid PIN → 400")
    @WithMockUser
    void checkout_invalidPin_returns400() throws Exception {
        CheckoutRequest req = buildValidRequest();
        req.getShippingAddress().setPinCode("12345");  // invalid — 5 digits

        mockMvc.perform(post("/api/v1/checkout")
            .with(SecurityMockMvcRequestPostProcessors.csrf())
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(req)))
            .andExpect(status().isBadRequest());
    }
}
