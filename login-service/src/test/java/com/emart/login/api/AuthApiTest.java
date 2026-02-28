package com.emart.login.api;

import io.restassured.RestAssured;
import io.restassured.http.ContentType;
import io.restassured.response.Response;
import org.junit.jupiter.api.*;

import static io.restassured.RestAssured.*;
import static org.hamcrest.Matchers.*;

/**
 * API Tests - Run against a DEPLOYED instance.
 * 
 * Configure via environment variables:
 *   API_BASE_URL=http://your-server:8080 (default: http://localhost:8080)
 * 
 * Run:
 *   mvn test -P api-test -DAPI_BASE_URL=http://dev-server:8080
 */
@DisplayName("Emart Login Service - API Tests")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class AuthApiTest {

    private static final String BASE_URL = System.getenv().getOrDefault(
        "API_BASE_URL", "http://localhost:8080");
    
    private static String authToken;
    private static final String TEST_EMAIL = "apitest_" + System.currentTimeMillis() + "@test.com";

    @BeforeAll
    static void setup() {
        RestAssured.baseURI = BASE_URL;
        RestAssured.enableLoggingOfRequestAndResponseIfValidationFails();
        System.out.println("Running API tests against: " + BASE_URL);
    }

    // ================================================================
    // HEALTH ENDPOINT TESTS
    // ================================================================

    @Test
    @Order(1)
    @DisplayName("API-H001: GET /health should return 200 with status UP")
    void getHealth_ShouldReturn200() {
        given()
            .when()
                .get("/health")
            .then()
                .statusCode(200)
                .contentType(ContentType.JSON)
                .body("status", equalTo("UP"))
                .body("service", equalTo("emart-login-service"))
                .body("version", notNullValue())
                .body("timestamp", notNullValue());
    }

    @Test
    @Order(2)
    @DisplayName("API-H002: GET /health/live should return 200 with liveness probe data")
    void getLiveness_ShouldReturn200() {
        given()
            .when()
                .get("/health/live")
            .then()
                .statusCode(200)
                .body("status", equalTo("UP"))
                .body("probe", equalTo("liveness"))
                .body("description", notNullValue());
    }

    @Test
    @Order(3)
    @DisplayName("API-H003: GET /health/ready should return 200 with readiness probe data")
    void getReadiness_ShouldReturn200() {
        given()
            .when()
                .get("/health/ready")
            .then()
                .statusCode(200)
                .body("status", equalTo("UP"))
                .body("probe", equalTo("readiness"))
                .body("checks.mongodb", equalTo("UP"));
    }

    // ================================================================
    // SIGNUP ENDPOINT TESTS
    // ================================================================

    @Test
    @Order(10)
    @DisplayName("API-S001: POST /api/v1/auth/signup should create user and return token")
    void signup_ValidData_ShouldReturn201WithToken() {
        String body = """
            {
              "name": "API Test User",
              "email": "%s",
              "phone": "+911111111111",
              "password": "Password@123",
              "confirmPassword": "Password@123",
              "city": "Hyderabad"
            }
            """.formatted(TEST_EMAIL);

        Response response = given()
            .contentType(ContentType.JSON)
            .body(body)
        .when()
            .post("/api/v1/auth/signup")
        .then()
            .statusCode(201)
            .body("success", equalTo(true))
            .body("data.token", notNullValue())
            .body("data.tokenType", equalTo("Bearer"))
            .body("data.email", equalTo(TEST_EMAIL))
            .body("data.roles", hasItem("ROLE_USER"))
            .extract().response();

        authToken = response.path("data.token");
        System.out.println("Captured auth token for subsequent tests: " + authToken.substring(0, 20) + "...");
    }

    @Test
    @Order(11)
    @DisplayName("API-S002: POST /api/v1/auth/signup with missing name should return 400")
    void signup_MissingName_ShouldReturn400() {
        String body = """
            {
              "email": "nomname@test.com",
              "phone": "+912222222222",
              "password": "Password@123",
              "confirmPassword": "Password@123",
              "city": "Delhi"
            }
            """;

        given()
            .contentType(ContentType.JSON)
            .body(body)
        .when()
            .post("/api/v1/auth/signup")
        .then()
            .statusCode(400)
            .body("success", equalTo(false))
            .body("errors.name", notNullValue());
    }

    @Test
    @Order(12)
    @DisplayName("API-S003: POST /api/v1/auth/signup with duplicate email should return 409")
    void signup_DuplicateEmail_ShouldReturn409() {
        String body = """
            {
              "name": "Duplicate User",
              "email": "%s",
              "phone": "+913333333333",
              "password": "Password@123",
              "confirmPassword": "Password@123",
              "city": "Kolkata"
            }
            """.formatted(TEST_EMAIL);

        given()
            .contentType(ContentType.JSON)
            .body(body)
        .when()
            .post("/api/v1/auth/signup")
        .then()
            .statusCode(409)
            .body("success", equalTo(false));
    }

    @Test
    @Order(13)
    @DisplayName("API-S004: POST /api/v1/auth/signup with weak password should return 400")
    void signup_WeakPassword_ShouldReturn400() {
        String body = """
            {
              "name": "Test User",
              "email": "weakpass@test.com",
              "phone": "+914444444444",
              "password": "weak",
              "confirmPassword": "weak",
              "city": "Pune"
            }
            """;

        given()
            .contentType(ContentType.JSON)
            .body(body)
        .when()
            .post("/api/v1/auth/signup")
        .then()
            .statusCode(400)
            .body("errors.password", notNullValue());
    }

    // ================================================================
    // LOGIN ENDPOINT TESTS
    // ================================================================

    @Test
    @Order(20)
    @DisplayName("API-L001: POST /api/v1/auth/login with valid credentials should return 200")
    void login_ValidCredentials_ShouldReturn200() {
        String body = """
            {
              "email": "%s",
              "password": "Password@123"
            }
            """.formatted(TEST_EMAIL);

        given()
            .contentType(ContentType.JSON)
            .body(body)
        .when()
            .post("/api/v1/auth/login")
        .then()
            .statusCode(200)
            .body("success", equalTo(true))
            .body("data.token", notNullValue())
            .body("data.email", equalTo(TEST_EMAIL));
    }

    @Test
    @Order(21)
    @DisplayName("API-L002: POST /api/v1/auth/login with wrong password should return 401")
    void login_WrongPassword_ShouldReturn401() {
        String body = """
            {
              "email": "%s",
              "password": "WrongPassword@999"
            }
            """.formatted(TEST_EMAIL);

        given()
            .contentType(ContentType.JSON)
            .body(body)
        .when()
            .post("/api/v1/auth/login")
        .then()
            .statusCode(401)
            .body("success", equalTo(false));
    }

    @Test
    @Order(22)
    @DisplayName("API-L003: POST /api/v1/auth/login with non-existent user should return 401")
    void login_NonExistentUser_ShouldReturn401() {
        String body = """
            {
              "email": "nonexistent@test.com",
              "password": "Password@123"
            }
            """;

        given()
            .contentType(ContentType.JSON)
            .body(body)
        .when()
            .post("/api/v1/auth/login")
        .then()
            .statusCode(401)
            .body("success", equalTo(false));
    }

    @Test
    @Order(23)
    @DisplayName("API-L004: POST /api/v1/auth/login with missing credentials should return 400")
    void login_MissingCredentials_ShouldReturn400() {
        given()
            .contentType(ContentType.JSON)
            .body("{}")
        .when()
            .post("/api/v1/auth/login")
        .then()
            .statusCode(400);
    }

    // ================================================================
    // CONTENT TYPE & SECURITY TESTS
    // ================================================================

    @Test
    @Order(30)
    @DisplayName("API-SEC001: Should reject non-JSON content type")
    void signup_NonJsonContentType_ShouldReturn415() {
        given()
            .contentType(ContentType.TEXT)
            .body("name=test")
        .when()
            .post("/api/v1/auth/signup")
        .then()
            .statusCode(anyOf(equalTo(415), equalTo(400)));
    }

    @Test
    @Order(31)
    @DisplayName("API-SEC002: Protected endpoints should require Authorization header")
    void protectedEndpoint_WithoutToken_ShouldReturn401() {
        given()
        .when()
            .get("/api/v1/user/profile")
        .then()
            .statusCode(anyOf(equalTo(401), equalTo(403)));
    }
}
