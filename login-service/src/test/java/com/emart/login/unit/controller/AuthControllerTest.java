package com.emart.login.unit.controller;

import com.emart.login.controller.AuthController;
import com.emart.login.dto.AuthResponse;
import com.emart.login.dto.LoginRequest;
import com.emart.login.dto.SignupRequest;
import com.emart.login.exception.DuplicateUserException;
import com.emart.login.exception.GlobalExceptionHandler;
import com.emart.login.service.AuthService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.print;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("AuthController Unit Tests")
class AuthControllerTest {

    @Mock private AuthService authService;
    @InjectMocks private AuthController authController;

    private MockMvc mockMvc;
    private ObjectMapper objectMapper;
    private AuthResponse mockAuthResponse;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(authController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
        objectMapper = new ObjectMapper();
        objectMapper.findAndRegisterModules();

        mockAuthResponse = AuthResponse.builder()
                .success(true)
                .token("jwt-token-123")
                .tokenType("Bearer")
                .expiresIn(86400000L)
                .userId("user-123")
                .name("John Doe")
                .email("john@example.com")
                .roles(List.of("ROLE_USER"))
                .message("Authentication successful")
                .build();
    }

    @Nested
    @DisplayName("POST /api/v1/auth/signup")
    class SignupEndpointTests {

        @Test
        @DisplayName("Should return 201 Created with token on successful signup")
        void signup_ValidRequest_Returns201() throws Exception {
            SignupRequest request = SignupRequest.builder()
                    .name("John Doe")
                    .email("john@example.com")
                    .phone("+919876543210")
                    .password("Password@123")
                    .confirmPassword("Password@123")
                    .city("Mumbai")
                    .build();

            when(authService.signup(any())).thenReturn(mockAuthResponse);

            mockMvc.perform(post("/api/v1/auth/signup")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(request)))
                    .andDo(print())
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.token").value("jwt-token-123"))
                    .andExpect(jsonPath("$.message").value("Account created successfully"));
        }

        @Test
        @DisplayName("Should return 400 Bad Request when name is blank")
        void signup_BlankName_Returns400() throws Exception {
            SignupRequest request = SignupRequest.builder()
                    .name("")
                    .email("john@example.com")
                    .phone("+919876543210")
                    .password("Password@123")
                    .confirmPassword("Password@123")
                    .city("Mumbai")
                    .build();

            mockMvc.perform(post("/api/v1/auth/signup")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.success").value(false))
                    .andExpect(jsonPath("$.errors.name").exists());
        }

        @Test
        @DisplayName("Should return 400 Bad Request for invalid email format")
        void signup_InvalidEmail_Returns400() throws Exception {
            SignupRequest request = SignupRequest.builder()
                    .name("John Doe")
                    .email("not-an-email")
                    .phone("+919876543210")
                    .password("Password@123")
                    .confirmPassword("Password@123")
                    .city("Mumbai")
                    .build();

            mockMvc.perform(post("/api/v1/auth/signup")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.errors.email").exists());
        }

        @Test
        @DisplayName("Should return 409 Conflict for duplicate email")
        void signup_DuplicateEmail_Returns409() throws Exception {
            SignupRequest request = SignupRequest.builder()
                    .name("John Doe")
                    .email("existing@example.com")
                    .phone("+919876543210")
                    .password("Password@123")
                    .confirmPassword("Password@123")
                    .city("Mumbai")
                    .build();

            when(authService.signup(any())).thenThrow(
                new DuplicateUserException("Email already registered"));

            mockMvc.perform(post("/api/v1/auth/signup")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isConflict())
                    .andExpect(jsonPath("$.success").value(false));
        }
    }

    @Nested
    @DisplayName("POST /api/v1/auth/login")
    class LoginEndpointTests {

        @Test
        @DisplayName("Should return 200 OK with token on successful login")
        void login_ValidCredentials_Returns200() throws Exception {
            LoginRequest request = LoginRequest.builder()
                    .email("john@example.com")
                    .password("Password@123")
                    .build();

            when(authService.login(any())).thenReturn(mockAuthResponse);

            mockMvc.perform(post("/api/v1/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.token").value("jwt-token-123"))
                    .andExpect(jsonPath("$.data.tokenType").value("Bearer"));
        }

        @Test
        @DisplayName("Should return 400 when email is missing in login")
        void login_MissingEmail_Returns400() throws Exception {
            LoginRequest request = LoginRequest.builder()
                    .password("Password@123")
                    .build();

            mockMvc.perform(post("/api/v1/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest());
        }
    }
}
