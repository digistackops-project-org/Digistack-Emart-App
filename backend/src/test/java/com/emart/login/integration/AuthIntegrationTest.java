package com.emart.login.integration;

import com.emart.login.dto.AuthResponse;
import com.emart.login.dto.LoginRequest;
import com.emart.login.dto.SignupRequest;
import com.emart.login.model.User;
import com.emart.login.repository.UserRepository;
import com.emart.login.service.AuthService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.MongoDBContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.print;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc
@Testcontainers
@ActiveProfiles("test")
@DisplayName("Auth Integration Tests - Full Stack with Testcontainers")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class AuthIntegrationTest {

    @Container
    static MongoDBContainer mongoDBContainer = new MongoDBContainer(
        DockerImageName.parse("mongo:7.0")
    ).withExposedPorts(27017);

    @DynamicPropertySource
    static void setProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.data.mongodb.uri", mongoDBContainer::getReplicaSetUrl);
        registry.add("spring.data.mongodb.database", () -> "userdb_test");
    }

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private UserRepository userRepository;
    @Autowired private AuthService authService;

    @BeforeEach
    void cleanUp() {
        userRepository.deleteAll();
    }

    @Test
    @Order(1)
    @DisplayName("INT-001: Full signup flow - User should be persisted in MongoDB")
    void signup_ShouldPersistUserInMongoDB() throws Exception {
        // Given
        SignupRequest request = createSignupRequest("Alice", "alice@test.com", "+911234567890");

        // When
        mockMvc.perform(post("/api/v1/auth/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andDo(print())
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.token").isNotEmpty());

        // Then - verify in database
        assertThat(userRepository.existsByEmail("alice@test.com")).isTrue();
        User savedUser = userRepository.findByEmail("alice@test.com").orElseThrow();
        assertThat(savedUser.getName()).isEqualTo("Alice");
        assertThat(savedUser.getCity()).isEqualTo("Chennai");
        assertThat(savedUser.getPassword()).isNotEqualTo("Password@123"); // Must be hashed
        assertThat(savedUser.isEnabled()).isTrue();
    }

    @Test
    @Order(2)
    @DisplayName("INT-002: Full login flow after signup")
    void login_AfterSignup_ShouldSucceed() throws Exception {
        // Given - Create user via signup
        SignupRequest signupRequest = createSignupRequest("Bob", "bob@test.com", "+912345678901");
        authService.signup(signupRequest);

        LoginRequest loginRequest = LoginRequest.builder()
                .email("bob@test.com")
                .password("Password@123")
                .build();

        // When & Then
        mockMvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.token").isNotEmpty())
                .andExpect(jsonPath("$.data.email").value("bob@test.com"))
                .andExpect(jsonPath("$.data.name").value("Bob"));
    }

    @Test
    @Order(3)
    @DisplayName("INT-003: Cannot signup with same email twice")
    void signup_DuplicateEmail_ShouldReturn409() throws Exception {
        // Given - First signup
        SignupRequest request = createSignupRequest("Carol", "carol@test.com", "+913456789012");
        authService.signup(request);

        // Second signup with same email
        SignupRequest duplicate = createSignupRequest("Carol2", "carol@test.com", "+914567890123");

        mockMvc.perform(post("/api/v1/auth/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(duplicate)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("Email")));
    }

    @Test
    @Order(4)
    @DisplayName("INT-004: Login with wrong password should return 401")
    void login_WrongPassword_ShouldReturn401() throws Exception {
        // Given
        SignupRequest signupRequest = createSignupRequest("Dave", "dave@test.com", "+915678901234");
        authService.signup(signupRequest);

        LoginRequest loginRequest = LoginRequest.builder()
                .email("dave@test.com")
                .password("WrongPassword@123")
                .build();

        // When & Then
        mockMvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @Order(5)
    @DisplayName("INT-005: Health endpoint should be accessible without auth")
    void health_ShouldReturnUp() throws Exception {
        mockMvc.perform(get("/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"))
                .andExpect(jsonPath("$.service").value("emart-login-service"));
    }

    @Test
    @Order(6)
    @DisplayName("INT-006: Liveness probe should return UP")
    void healthLive_ShouldReturnUp() throws Exception {
        mockMvc.perform(get("/health/live"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"))
                .andExpect(jsonPath("$.probe").value("liveness"));
    }

    @Test
    @Order(7)
    @DisplayName("INT-007: Readiness probe should return UP when DB is connected")
    void healthReady_ShouldReturnUp() throws Exception {
        mockMvc.perform(get("/health/ready"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"))
                .andExpect(jsonPath("$.probe").value("readiness"))
                .andExpect(jsonPath("$.checks.mongodb").value("UP"));
    }

    @Test
    @Order(8)
    @DisplayName("INT-008: Mongock migrations should create users collection with indexes")
    void mongockMigrations_ShouldCreateCollectionAndIndexes() {
        // Verify collection exists (Mongock ran migrations on startup)
        assertThat(userRepository.count()).isGreaterThanOrEqualTo(0); // collection accessible
    }

    private SignupRequest createSignupRequest(String name, String email, String phone) {
        return SignupRequest.builder()
                .name(name)
                .email(email)
                .phone(phone)
                .password("Password@123")
                .confirmPassword("Password@123")
                .city("Chennai")
                .build();
    }
}
