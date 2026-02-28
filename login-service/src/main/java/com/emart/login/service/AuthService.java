package com.emart.login.service;

import com.emart.login.dto.AuthResponse;
import com.emart.login.dto.LoginRequest;
import com.emart.login.dto.SignupRequest;
import com.emart.login.exception.DuplicateUserException;
import com.emart.login.exception.InvalidCredentialsException;
import com.emart.login.exception.UserNotFoundException;
import com.emart.login.exception.ValidationException;
import com.emart.login.model.User;
import com.emart.login.repository.UserRepository;
import com.emart.login.security.JwtService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    /**
     * Register a new user with provided details.
     * Stores in MongoDB "userdb" database "users" collection.
     */
    @Transactional
    public AuthResponse signup(SignupRequest request) {
        log.info("Processing signup for email: {}", request.getEmail());

        // Validate passwords match
        if (!request.getPassword().equals(request.getConfirmPassword())) {
            throw new ValidationException("Passwords do not match");
        }

        // Check duplicate email
        if (userRepository.existsByEmail(request.getEmail().toLowerCase())) {
            log.warn("Signup attempt with existing email: {}", request.getEmail());
            throw new DuplicateUserException("Email already registered: " + request.getEmail());
        }

        // Check duplicate phone
        if (userRepository.existsByPhone(request.getPhone())) {
            log.warn("Signup attempt with existing phone: {}", request.getPhone());
            throw new DuplicateUserException("Phone number already registered: " + request.getPhone());
        }

        // Build and save user
        User user = User.builder()
                .name(request.getName().trim())
                .email(request.getEmail().toLowerCase().trim())
                .phone(request.getPhone().trim())
                .password(passwordEncoder.encode(request.getPassword()))
                .city(request.getCity().trim())
                .enabled(true)
                .build();

        User savedUser = userRepository.save(user);
        log.info("User registered successfully with ID: {}", savedUser.getId());

        // Generate JWT token
        String token = jwtService.generateToken(savedUser);
        long expiresIn = jwtService.getExpirationTime();

        return AuthResponse.success(
                token, expiresIn, savedUser.getId(),
                savedUser.getName(), savedUser.getEmail(),
                savedUser.getRoles()
        );
    }

    /**
     * Authenticate existing user by email and password.
     */
    @Transactional
    public AuthResponse login(LoginRequest request) {
        log.info("Processing login for email: {}", request.getEmail());

        // Find user by email
        User user = userRepository.findByEmail(request.getEmail().toLowerCase())
                .orElseThrow(() -> {
                    log.warn("Login attempt for non-existent email: {}", request.getEmail());
                    return new UserNotFoundException("Invalid email or password");
                });

        // Check if account is locked
        if (user.isLocked()) {
            log.warn("Login attempt for locked account: {}", request.getEmail());
            throw new InvalidCredentialsException("Account is locked. Please contact support.");
        }

        // Check if account is enabled
        if (!user.isEnabled()) {
            log.warn("Login attempt for disabled account: {}", request.getEmail());
            throw new InvalidCredentialsException("Account is disabled. Please contact support.");
        }

        // Validate password
        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            handleFailedLogin(user);
            log.warn("Invalid password for email: {}", request.getEmail());
            throw new InvalidCredentialsException("Invalid email or password");
        }

        // Reset login attempts on successful login
        user.setLoginAttempts(0);
        user.setLastLogin(LocalDateTime.now());
        userRepository.save(user);

        String token = jwtService.generateToken(user);
        long expiresIn = jwtService.getExpirationTime();

        log.info("Login successful for user: {}", user.getId());

        return AuthResponse.success(
                token, expiresIn, user.getId(),
                user.getName(), user.getEmail(),
                user.getRoles()
        );
    }

    /**
     * Handle failed login - increment attempts and lock after 5 failures.
     */
    private void handleFailedLogin(User user) {
        int attempts = user.getLoginAttempts() + 1;
        user.setLoginAttempts(attempts);
        if (attempts >= 5) {
            user.setLocked(true);
            log.warn("Account locked due to too many failed attempts: {}", user.getEmail());
        }
        userRepository.save(user);
    }
}
