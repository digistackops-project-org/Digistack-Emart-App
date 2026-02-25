package com.emart.login.controller;

import com.emart.login.dto.ApiResponse;
import com.emart.login.dto.AuthResponse;
import com.emart.login.dto.LoginRequest;
import com.emart.login.dto.SignupRequest;
import com.emart.login.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class AuthController {

    private final AuthService authService;

    /**
     * POST /api/v1/auth/signup
     * Register a new user account.
     * Stores in MongoDB userdb.users collection.
     */
    @PostMapping("/signup")
    public ResponseEntity<ApiResponse<AuthResponse>> signup(
            @Valid @RequestBody SignupRequest request) {

        log.info("Signup request received for email: {}", request.getEmail());
        AuthResponse authResponse = authService.signup(request);
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.success(authResponse, "Account created successfully"));
    }

    /**
     * POST /api/v1/auth/login
     * Authenticate an existing user.
     */
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(
            @Valid @RequestBody LoginRequest request) {

        log.info("Login request received for email: {}", request.getEmail());
        AuthResponse authResponse = authService.login(request);
        return ResponseEntity.ok(ApiResponse.success(authResponse, "Login successful"));
    }

    /**
     * POST /api/v1/auth/logout
     * Client-side token invalidation (stateless JWT).
     */
    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout() {
        return ResponseEntity.ok(ApiResponse.success("Logout successful"));
    }
}
