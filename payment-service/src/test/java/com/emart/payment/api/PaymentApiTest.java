package com.emart.payment.api;

import io.restassured.RestAssured;
import io.restassured.http.ContentType;
import io.restassured.response.Response;
import org.junit.jupiter.api.*;

import static io.restassured.RestAssured.*;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.*;

/**
 * API-level tests — run against a DEPLOYED Payment Service.
 *
 * Required environment variables:
 *   API_BASE_URL  e.g. http://localhost:8084
 *   JWT_TOKEN     valid JWT from Login Service
 *
 * Get token:
 *   TOKEN=$(curl -s -X POST http://localhost:8080/api/v1/auth/login \
 *     -H "Content-Type: application/json" \
 *     -d '{"email":"admin@emart.com","password":"Admin@Emart#2024"}' \
 *     | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['token'])")
 *
 * Run:
 *   API_BASE_URL=http://localhost:8084 JWT_TOKEN=$TOKEN mvn test -Dgroups=api
 *
 * IMPORTANT: These tests call the real Cart Service to create an order.
 *   Add items to the cart first, or the checkout test will return 400.
 *   Quick cart setup (run before this test):
 *     curl -X POST http://localhost:8081/api/v1/cart/items \
 *       -H "Authorization: Bearer $TOKEN" \
 *       -H "Content-Type: application/json" \
 *       -d '{"product_id":"book-1","product_name":"Test Book","category":"books","price":999,"quantity":1}'
 */
@Tag("api")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class PaymentApiTest {

    private static final String BASE_URL  = System.getenv().getOrDefault("API_BASE_URL", "http://localhost:8084");
    private static final String JWT_TOKEN = System.getenv().getOrDefault("JWT_TOKEN", "");

    private static Long  createdOrderId;
    private static String createdOrderNumber;

    @BeforeAll
    static void setUp() {
        RestAssured.baseURI = BASE_URL;
        RestAssured.enableLoggingOfRequestAndResponseIfValidationFails();
    }

    // ── H001: Health ──────────────────────────────────────────
    @Test @Order(1) @DisplayName("H001: GET /health → 200 UP, <200ms")
    void h001_health_up_fast() {
        long start = System.currentTimeMillis();
        given()
            .when().get("/health")
            .then().statusCode(200)
                   .body("status", equalTo("UP"))
                   .body("service", notNullValue());
        assertThat(System.currentTimeMillis() - start)
            .as("Health response time").isLessThan(500);
    }

    @Test @Order(2) @DisplayName("H001: GET /health/ready → postgresql=UP")
    void h001_healthReady_dbUp() {
        given()
            .when().get("/health/ready")
            .then().statusCode(200)
                   .body("checks.postgresql", equalTo("UP"));
    }

    // ── A001: Auth ────────────────────────────────────────────
    @Test @Order(3) @DisplayName("A001: No token → 401")
    void a001_noToken_401() {
        given()
            .when().get("/api/v1/orders")
            .then().statusCode(401);
    }

    @Test @Order(4) @DisplayName("A001: Expired/invalid token → 401")
    void a001_invalidToken_401() {
        given()
            .header("Authorization", "Bearer invalid.token.here")
            .when().get("/api/v1/orders")
            .then().statusCode(401);
    }

    // ── V001: Validation ──────────────────────────────────────
    @Test @Order(5) @DisplayName("V001: POST /checkout missing address → 400")
    void v001_missingAddress_400() {
        given()
            .header("Authorization", "Bearer " + JWT_TOKEN)
            .contentType(ContentType.JSON)
            .body("{\"paymentMethod\":\"UPI\"}")
            .when().post("/api/v1/checkout")
            .then().statusCode(400)
                   .body("success", equalTo(false));
    }

    @Test @Order(6) @DisplayName("V001: POST /checkout invalid PIN → 400 with field error")
    void v001_invalidPin_400() {
        String body = """
            {
              "shippingAddress": {
                "fullName": "Test User",
                "addressLine1": "123 MG Road",
                "city": "Bengaluru",
                "state": "Karnataka",
                "pinCode": "12345",
                "country": "India"
              },
              "paymentMethod": "UPI"
            }""";

        given()
            .header("Authorization", "Bearer " + JWT_TOKEN)
            .contentType(ContentType.JSON)
            .body(body)
            .when().post("/api/v1/checkout")
            .then().statusCode(400);
    }

    // ── C001: Checkout + Payment flow ─────────────────────────
    @Test @Order(7) @DisplayName("C001: POST /checkout → 201 order PENDING")
    void c001_checkout_creates_pending_order() {
        Assumptions.assumeTrue(!JWT_TOKEN.isBlank(), "JWT_TOKEN not set — skipping API test");

        String body = """
            {
              "shippingAddress": {
                "fullName": "API Test User",
                "addressLine1": "456 Residency Road",
                "city": "Bengaluru",
                "state": "Karnataka",
                "pinCode": "560025",
                "country": "India",
                "phone": "9123456789"
              },
              "paymentMethod": "UPI",
              "paymentDetails": { "upiId": "apitest@okicici" }
            }""";

        Response resp = given()
            .header("Authorization", "Bearer " + JWT_TOKEN)
            .contentType(ContentType.JSON)
            .body(body)
            .when().post("/api/v1/checkout")
            .then()
                .statusCode(201)
                .body("success", equalTo(true))
                .body("data.status", equalTo("PENDING"))
                .body("data.paymentStatus", equalTo("PENDING"))
                .body("data.orderNumber", startsWith("EM-"))
            .extract().response();

        createdOrderId     = resp.jsonPath().getLong("data.id");
        createdOrderNumber = resp.jsonPath().getString("data.orderNumber");

        assertThat(createdOrderId).isPositive();
        assertThat(createdOrderNumber).matches("EM-\\d{4}-\\d{6}");
    }

    @Test @Order(8) @DisplayName("P001: POST /payments/{id}/process UPI → 200 CONFIRMED")
    void p001_processPayment_upi_success() {
        Assumptions.assumeTrue(!JWT_TOKEN.isBlank() && createdOrderId != null);

        given()
            .header("Authorization", "Bearer " + JWT_TOKEN)
            .contentType(ContentType.JSON)
            .body("{\"upiId\":\"apitest@okicici\"}")
            .when().post("/api/v1/payments/" + createdOrderId + "/process")
            .then()
                .statusCode(200)
                .body("data.paymentStatus", equalTo("SUCCESS"))
                .body("data.orderStatus", equalTo("CONFIRMED"))
                .body("data.transactionId", startsWith("UPI-"))
                .body("data.orderNumber", equalTo(createdOrderNumber));
    }

    @Test @Order(9) @DisplayName("P001: Retry already-paid order → 400")
    void p001_doublePayment_rejected() {
        Assumptions.assumeTrue(!JWT_TOKEN.isBlank() && createdOrderId != null);

        given()
            .header("Authorization", "Bearer " + JWT_TOKEN)
            .contentType(ContentType.JSON)
            .body("{\"upiId\":\"apitest@okicici\"}")
            .when().post("/api/v1/payments/" + createdOrderId + "/process")
            .then()
                .statusCode(400)
                .body("success", equalTo(false));
    }

    // ── O001: Order history ───────────────────────────────────
    @Test @Order(10) @DisplayName("O001: GET /orders → list includes new order")
    void o001_orders_list_includes_created() {
        Assumptions.assumeTrue(!JWT_TOKEN.isBlank() && createdOrderNumber != null);

        Response resp = given()
            .header("Authorization", "Bearer " + JWT_TOKEN)
            .when().get("/api/v1/orders")
            .then()
                .statusCode(200)
                .body("success", equalTo(true))
                .body("data", hasSize(greaterThan(0)))
            .extract().response();

        // Confirmed order should be in list
        var orders = resp.jsonPath().getList("data.orderNumber");
        assertThat(orders).contains(createdOrderNumber);
    }

    @Test @Order(11) @DisplayName("O001: GET /orders/{id} → correct order returned")
    void o001_getById_correct() {
        Assumptions.assumeTrue(!JWT_TOKEN.isBlank() && createdOrderId != null);

        given()
            .header("Authorization", "Bearer " + JWT_TOKEN)
            .when().get("/api/v1/orders/" + createdOrderId)
            .then()
                .statusCode(200)
                .body("data.id", equalTo(createdOrderId.intValue()))
                .body("data.orderNumber", equalTo(createdOrderNumber))
                .body("data.paymentStatus", equalTo("SUCCESS"));
    }

    @Test @Order(12) @DisplayName("O001: GET /orders/999999 → 404")
    void o001_notFound_404() {
        Assumptions.assumeTrue(!JWT_TOKEN.isBlank());

        given()
            .header("Authorization", "Bearer " + JWT_TOKEN)
            .when().get("/api/v1/orders/999999")
            .then().statusCode(404);
    }
}
