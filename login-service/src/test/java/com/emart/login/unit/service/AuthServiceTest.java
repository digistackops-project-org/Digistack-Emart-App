package com.emart.login.unit.service;

import com.emart.login.dto.AuthResponse;
import com.emart.login.dto.LoginRequest;
import com.emart.login.dto.SignupRequest;
import com.emart.login.exception.DuplicateUserException;
import com.emart.login.exception.InvalidCredentialsException;
import com.emart.login.exception.ValidationException;
import com.emart.login.model.User;
import com.emart.login.repository.UserRepository;
import com.emart.login.security.JwtService;
import com.emart.login.service.AuthService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("AuthService Unit Tests")
class AuthServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private JwtService jwtService;

    @InjectMocks private AuthService authService;

    private SignupRequest validSignupRequest;
    private LoginRequest validLoginRequest;
    private User mockUser;

    @BeforeEach
    void setUp() {
        validSignupRequest = SignupRequest.builder()
                .name("John Doe")
                .email("john@example.com")
                .phone("+919876543210")
                .password("Password@123")
                .confirmPassword("Password@123")
                .city("Mumbai")
                .build();

        validLoginRequest = LoginRequest.builder()
                .email("john@example.com")
                .password("Password@123")
                .build();

        mockUser = User.builder()
                .id("user-id-123")
                .name("John Doe")
                .email("john@example.com")
                .phone("+919876543210")
                .password("$2a$12$encodedPassword")
                .city("Mumbai")
                .enabled(true)
                .locked(false)
                .roles(List.of("ROLE_USER"))
                .build();
    }

    @Nested
    @DisplayName("Signup Tests")
    class SignupTests {

        @Test
        @DisplayName("Should register user successfully with valid data")
        void signup_WithValidData_ShouldReturnSuccess() {
            // Given
            when(userRepository.existsByEmail(anyString())).thenReturn(false);
            when(userRepository.existsByPhone(anyString())).thenReturn(false);
            when(passwordEncoder.encode(anyString())).thenReturn("$2a$12$encoded");
            when(userRepository.save(any(User.class))).thenReturn(mockUser);
            when(jwtService.generateToken(any(User.class))).thenReturn("jwt-token-123");
            when(jwtService.getExpirationTime()).thenReturn(86400000L);

            // When
            AuthResponse response = authService.signup(validSignupRequest);

            // Then
            assertThat(response).isNotNull();
            assertThat(response.isSuccess()).isTrue();
            assertThat(response.getToken()).isEqualTo("jwt-token-123");
            assertThat(response.getEmail()).isEqualTo("john@example.com");
            verify(userRepository, times(1)).save(any(User.class));
        }

        @Test
        @DisplayName("Should throw ValidationException when passwords do not match")
        void signup_PasswordMismatch_ShouldThrowValidationException() {
            // Given
            validSignupRequest.setConfirmPassword("DifferentPass@123");

            // When & Then
            assertThatThrownBy(() -> authService.signup(validSignupRequest))
                    .isInstanceOf(ValidationException.class)
                    .hasMessageContaining("Passwords do not match");
            verify(userRepository, never()).save(any());
        }

        @Test
        @DisplayName("Should throw DuplicateUserException when email already exists")
        void signup_DuplicateEmail_ShouldThrowDuplicateUserException() {
            // Given
            when(userRepository.existsByEmail(anyString())).thenReturn(true);

            // When & Then
            assertThatThrownBy(() -> authService.signup(validSignupRequest))
                    .isInstanceOf(DuplicateUserException.class)
                    .hasMessageContaining("Email already registered");
            verify(userRepository, never()).save(any());
        }

        @Test
        @DisplayName("Should throw DuplicateUserException when phone already exists")
        void signup_DuplicatePhone_ShouldThrowDuplicateUserException() {
            // Given
            when(userRepository.existsByEmail(anyString())).thenReturn(false);
            when(userRepository.existsByPhone(anyString())).thenReturn(true);

            // When & Then
            assertThatThrownBy(() -> authService.signup(validSignupRequest))
                    .isInstanceOf(DuplicateUserException.class)
                    .hasMessageContaining("Phone number already registered");
        }

        @Test
        @DisplayName("Should store email in lowercase")
        void signup_ShouldNormalizeEmailToLowercase() {
            // Given
            validSignupRequest.setEmail("JOHN@EXAMPLE.COM");
            when(userRepository.existsByEmail("john@example.com")).thenReturn(false);
            when(userRepository.existsByPhone(anyString())).thenReturn(false);
            when(passwordEncoder.encode(anyString())).thenReturn("encoded");
            when(userRepository.save(any(User.class))).thenReturn(mockUser);
            when(jwtService.generateToken(any())).thenReturn("token");
            when(jwtService.getExpirationTime()).thenReturn(86400000L);

            // When
            authService.signup(validSignupRequest);

            // Then
            verify(userRepository).save(argThat(user ->
                user.getEmail().equals("john@example.com")));
        }
    }

    @Nested
    @DisplayName("Login Tests")
    class LoginTests {

        @Test
        @DisplayName("Should login successfully with valid credentials")
        void login_WithValidCredentials_ShouldReturnToken() {
            // Given
            when(userRepository.findByEmail("john@example.com")).thenReturn(Optional.of(mockUser));
            when(passwordEncoder.matches("Password@123", mockUser.getPassword())).thenReturn(true);
            when(jwtService.generateToken(mockUser)).thenReturn("jwt-token");
            when(jwtService.getExpirationTime()).thenReturn(86400000L);

            // When
            AuthResponse response = authService.login(validLoginRequest);

            // Then
            assertThat(response.isSuccess()).isTrue();
            assertThat(response.getToken()).isEqualTo("jwt-token");
        }

        @Test
        @DisplayName("Should throw InvalidCredentialsException for non-existent user")
        void login_UserNotFound_ShouldThrowException() {
            // Given
            when(userRepository.findByEmail(anyString())).thenReturn(Optional.empty());

            // When & Then
            assertThatThrownBy(() -> authService.login(validLoginRequest))
                    .isInstanceOf(Exception.class);
        }

        @Test
        @DisplayName("Should throw InvalidCredentialsException for wrong password")
        void login_WrongPassword_ShouldThrowException() {
            // Given
            when(userRepository.findByEmail(anyString())).thenReturn(Optional.of(mockUser));
            when(passwordEncoder.matches(anyString(), anyString())).thenReturn(false);
            when(userRepository.save(any())).thenReturn(mockUser);

            // When & Then
            assertThatThrownBy(() -> authService.login(validLoginRequest))
                    .isInstanceOf(InvalidCredentialsException.class);
        }

        @Test
        @DisplayName("Should throw exception for locked account")
        void login_LockedAccount_ShouldThrowException() {
            // Given
            mockUser.setLocked(true);
            when(userRepository.findByEmail(anyString())).thenReturn(Optional.of(mockUser));

            // When & Then
            assertThatThrownBy(() -> authService.login(validLoginRequest))
                    .isInstanceOf(InvalidCredentialsException.class)
                    .hasMessageContaining("locked");
        }

        @Test
        @DisplayName("Should increment login attempts on failed login")
        void login_FailedAttempts_ShouldIncrementCounter() {
            // Given
            mockUser.setLoginAttempts(3);
            when(userRepository.findByEmail(anyString())).thenReturn(Optional.of(mockUser));
            when(passwordEncoder.matches(anyString(), anyString())).thenReturn(false);
            when(userRepository.save(any())).thenReturn(mockUser);

            // When & Then
            assertThatThrownBy(() -> authService.login(validLoginRequest));
            verify(userRepository).save(argThat(u -> u.getLoginAttempts() == 4));
        }

        @Test
        @DisplayName("Should lock account after 5 failed login attempts")
        void login_FiveFailedAttempts_ShouldLockAccount() {
            // Given
            mockUser.setLoginAttempts(4); // Next attempt = 5 -> lock
            when(userRepository.findByEmail(anyString())).thenReturn(Optional.of(mockUser));
            when(passwordEncoder.matches(anyString(), anyString())).thenReturn(false);
            when(userRepository.save(any())).thenReturn(mockUser);

            // When & Then
            assertThatThrownBy(() -> authService.login(validLoginRequest));
            verify(userRepository).save(argThat(u -> u.isLocked()));
        }
    }
}
