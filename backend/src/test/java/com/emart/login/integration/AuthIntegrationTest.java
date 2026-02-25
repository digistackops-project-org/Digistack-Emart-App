package com.emart.login.integration;

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
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("Auth Integration Tests - Full Stack (Physical MongoDB)")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class AuthIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private UserRepository userRepository;
    @Autowired private AuthService authService;

    @BeforeEach
    void cleanUp() {
        userRepository.deleteAll(); // Clean test DB before each test
    }

    @Test
    @Order(1)
    void signup_ShouldPersistUserInMongoDB() throws Exception {
        SignupRequest request = createSignupRequest("Alice", "alice@test.com", "+911234567890");

        mockMvc.perform(post("/api/v1/auth/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true));

        assertThat(userRepository.existsByEmail("alice@test.com")).isTrue();

        User savedUser = userRepository.findByEmail("alice@test.com").orElseThrow();
        assertThat(savedUser.getName()).isEqualTo("Alice");
        assertThat(savedUser.getPassword()).isNotEqualTo("Password@123");
    }

    @Test
    @Order(2)
    void login_AfterSignup_ShouldSucceed() throws Exception {
        SignupRequest signupRequest = createSignupRequest("Bob", "bob@test.com", "+912345678901");
        authService.signup(signupRequest);

        LoginRequest loginRequest = LoginRequest.builder()
                .email("bob@test.com")
                .password("Password@123")
                .build();

        mockMvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.email").value("bob@test.com"));
    }

    @Test
    @Order(3)
    void signup_DuplicateEmail_ShouldReturn409() throws Exception {
        SignupRequest request = createSignupRequest("Carol", "carol@test.com", "+913456789012");
        authService.signup(request);

        SignupRequest duplicate = createSignupRequest("Carol2", "carol@test.com", "+914567890123");

        mockMvc.perform(post("/api/v1/auth/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(duplicate)))
                .andExpect(status().isConflict());
    }

    @Test
    @Order(4)
    void login_WrongPassword_ShouldReturn401() throws Exception {
        SignupRequest signupRequest = createSignupRequest("Dave", "dave@test.com", "+915678901234");
        authService.signup(signupRequest);

        LoginRequest loginRequest = LoginRequest.builder()
                .email("dave@test.com")
                .password("WrongPassword@123")
                .build();

        mockMvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isUnauthorized());
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
