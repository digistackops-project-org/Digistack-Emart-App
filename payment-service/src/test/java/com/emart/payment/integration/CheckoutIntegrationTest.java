package com.emart.payment.integration;

import com.emart.payment.dto.*;
import com.emart.payment.model.Order;
import com.emart.payment.repository.OrderRepository;
import com.emart.payment.repository.PaymentRepository;
import com.emart.payment.service.CartServiceClient;
import com.emart.payment.service.CheckoutService;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.*;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.*;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.*;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Integration tests — use a real Testcontainers PostgreSQL database.
 * Flyway runs V1+V2 migrations before tests start.
 * Cart Service is mocked via @MockBean.
 */
@Testcontainers
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc
@Tag("integration")
class CheckoutIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15-alpine")
        .withDatabaseName("paymentdb_test")
        .withUsername("emart_payment")
        .withPassword("test_pass");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url",      postgres::getJdbcUrl);
        registry.add("spring.datasource.username",  postgres::getUsername);
        registry.add("spring.datasource.password",  postgres::getPassword);
        registry.add("app.jwt.secret",              () -> "integration-test-secret-at-least-32-chars!!");
    }

    @Autowired MockMvc            mockMvc;
    @Autowired ObjectMapper       objectMapper;
    @Autowired OrderRepository    orderRepository;
    @Autowired PaymentRepository  paymentRepository;

    // Cart Service is mocked — we don't need a real Go server running
    @MockBean CartServiceClient cartClient;

    private String authHeader;
    private Claims testClaims;

    @BeforeEach
    void setUp() {
        // Build a valid JWT signed with the test secret
        String secret = "integration-test-secret-at-least-32-chars!!";
        Key key       = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        String token  = Jwts.builder()
            .setSubject("test@emart.com")
            .claim("userId", "test-user-001")
            .claim("name", "Test User")
            .setExpiration(new Date(System.currentTimeMillis() + 3_600_000))
            .signWith(key)
            .compact();
        authHeader = "Bearer " + token;

        // Default cart mock — 2 books in cart
        List<CartItemSnapshot> cartItems = List.of(
            CartItemSnapshot.builder()
                .itemId("item-1").productId("book-1")
                .productName("Clean Code").category("books")
                .price(new BigDecimal("499.00")).quantity(1)
                .subtotal(new BigDecimal("499.00")).build(),
            CartItemSnapshot.builder()
                .itemId("item-2").productId("book-2")
                .productName("Design Patterns").category("books")
                .price(new BigDecimal("599.00")).quantity(1)
                .subtotal(new BigDecimal("599.00")).build()
        );
        when(cartClient.fetchCartItems(anyString())).thenReturn(cartItems);
        Mockito.doNothing().when(cartClient).clearCart(anyString());
    }

    private CheckoutRequest buildRequest(Order.PaymentMethod method) {
        return CheckoutRequest.builder()
            .shippingAddress(ShippingAddress.builder()
                .fullName("Test User").addressLine1("123 MG Road")
                .city("Bengaluru").state("Karnataka")
                .pinCode("560001").country("India").phone("9876543210")
                .build())
            .paymentMethod(method)
            .build();
    }

    // ── H001: Health endpoints ────────────────────────────────
    @Test @DisplayName("H001: GET /health → 200 UP")
    void h001_health_up() throws Exception {
        mockMvc.perform(get("/health"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("UP"));
    }

    @Test @DisplayName("H001: GET /health/ready → 200 postgresql=UP")
    void h001_healthReady_postgresUp() throws Exception {
        mockMvc.perform(get("/health/ready"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.checks.postgresql").value("UP"));
    }

    // ── A001: Auth enforcement ────────────────────────────────
    @Test @DisplayName("A001: POST /checkout without token → 401")
    void a001_checkout_noToken_401() throws Exception {
        mockMvc.perform(post("/api/v1/checkout")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(buildRequest(Order.PaymentMethod.UPI))))
            .andExpect(status().isUnauthorized());
    }

    @Test @DisplayName("A001: GET /orders without token → 401")
    void a001_orders_noToken_401() throws Exception {
        mockMvc.perform(get("/api/v1/orders"))
            .andExpect(status().isUnauthorized());
    }

    // ── C001: Create order (checkout) ─────────────────────────
    @Test @DisplayName("C001: POST /checkout → 201 with order number")
    void c001_checkout_createsOrder() throws Exception {
        String body = objectMapper.writeValueAsString(buildRequest(Order.PaymentMethod.UPI));

        mockMvc.perform(post("/api/v1/checkout")
            .header("Authorization", authHeader)
            .contentType(MediaType.APPLICATION_JSON)
            .content(body))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.orderNumber").isNotEmpty())
            .andExpect(jsonPath("$.data.status").value("PENDING"))
            .andExpect(jsonPath("$.data.paymentStatus").value("PENDING"))
            .andExpect(jsonPath("$.data.totalItems").value(2));
    }

    @Test @DisplayName("C001: Tax and shipping calculated correctly")
    void c001_checkout_amounts_correct() throws Exception {
        String body = objectMapper.writeValueAsString(buildRequest(Order.PaymentMethod.COD));

        MvcResult result = mockMvc.perform(post("/api/v1/checkout")
            .header("Authorization", authHeader)
            .contentType(MediaType.APPLICATION_JSON)
            .content(body))
            .andExpect(status().isCreated())
            .andReturn();

        var json   = objectMapper.readTree(result.getResponse().getContentAsString());
        var data   = json.get("data");
        // subtotal = 499 + 599 = 1098, tax = 18% = 197.64, shipping free (≥999), total = 1295.64
        assertThat(data.get("subtotal").asDouble()).isEqualTo(1098.00);
        assertThat(data.get("taxAmount").asDouble()).isEqualTo(197.64);
        assertThat(data.get("shippingFee").asDouble()).isEqualTo(0.00);
        assertThat(data.get("totalAmount").asDouble()).isEqualTo(1295.64);
    }

    @Test @DisplayName("C001: Empty cart → 400")
    void c001_emptyCart_400() throws Exception {
        when(cartClient.fetchCartItems(anyString())).thenReturn(List.of());

        mockMvc.perform(post("/api/v1/checkout")
            .header("Authorization", authHeader)
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(buildRequest(Order.PaymentMethod.UPI))))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.success").value(false));
    }

    // ── P001: Process payment ─────────────────────────────────
    @Test @DisplayName("P001: UPI valid → 200 SUCCESS, order CONFIRMED")
    void p001_upiPayment_success() throws Exception {
        // Step 1: checkout
        Long orderId = createOrderAndGetId();

        // Step 2: process payment
        String paymentBody = "{\"upiId\":\"test@okaxis\"}";

        mockMvc.perform(post("/api/v1/payments/" + orderId + "/process")
            .header("Authorization", authHeader)
            .contentType(MediaType.APPLICATION_JSON)
            .content(paymentBody))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.paymentStatus").value("SUCCESS"))
            .andExpect(jsonPath("$.data.orderStatus").value("CONFIRMED"))
            .andExpect(jsonPath("$.data.transactionId").isNotEmpty());
    }

    @Test @DisplayName("P001: Decline card → 402 FAILED, order PAYMENT_FAILED")
    void p001_declineCard_failedPayment() throws Exception {
        Long orderId = createOrderAndGetId();

        String paymentBody = "{\"cardNumber\":\"4000000000000002\"}";

        mockMvc.perform(post("/api/v1/payments/" + orderId + "/process")
            .header("Authorization", authHeader)
            .contentType(MediaType.APPLICATION_JSON)
            .content(paymentBody))
            .andExpect(status().isPaymentRequired())  // 402
            .andExpect(jsonPath("$.data.paymentStatus").value("FAILED"));
    }

    @Test @DisplayName("P001: Already-paid order → 400")
    void p001_doublePayment_rejected() throws Exception {
        Long orderId = createOrderAndGetId();

        String paymentBody = "{\"upiId\":\"test@upi\"}";

        // First payment succeeds
        mockMvc.perform(post("/api/v1/payments/" + orderId + "/process")
            .header("Authorization", authHeader)
            .contentType(MediaType.APPLICATION_JSON)
            .content(paymentBody))
            .andExpect(status().isOk());

        // Second attempt on same order → 400
        mockMvc.perform(post("/api/v1/payments/" + orderId + "/process")
            .header("Authorization", authHeader)
            .contentType(MediaType.APPLICATION_JSON)
            .content(paymentBody))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.success").value(false));
    }

    // ── O001: Order history ───────────────────────────────────
    @Test @DisplayName("O001: GET /orders returns user's orders")
    void o001_getOrders_returnsUserOrders() throws Exception {
        createOrderAndGetId();

        mockMvc.perform(get("/api/v1/orders")
            .header("Authorization", authHeader))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data").isArray());
    }

    @Test @DisplayName("O001: GET /orders/{id} returns correct order")
    void o001_getOrderById_returnsOrder() throws Exception {
        Long orderId = createOrderAndGetId();

        mockMvc.perform(get("/api/v1/orders/" + orderId)
            .header("Authorization", authHeader))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.id").value(orderId));
    }

    @Test @DisplayName("O001: GET /orders/999999 → 404")
    void o001_getOrderNotFound_404() throws Exception {
        mockMvc.perform(get("/api/v1/orders/999999")
            .header("Authorization", authHeader))
            .andExpect(status().isNotFound());
    }

    // ── Helper: create one order and return its id ─────────────
    private Long createOrderAndGetId() throws Exception {
        String body = objectMapper.writeValueAsString(buildRequest(Order.PaymentMethod.UPI));
        MvcResult result = mockMvc.perform(post("/api/v1/checkout")
            .header("Authorization", authHeader)
            .contentType(MediaType.APPLICATION_JSON)
            .content(body))
            .andExpect(status().isCreated())
            .andReturn();
        var json = objectMapper.readTree(result.getResponse().getContentAsString());
        return json.get("data").get("id").asLong();
    }
}
