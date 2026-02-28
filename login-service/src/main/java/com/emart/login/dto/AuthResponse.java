package com.emart.login.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthResponse {

    private String token;
    private String tokenType;
    private long expiresIn;
    private String userId;
    private String name;
    private String email;
    private List<String> roles;
    private String message;
    private boolean success;

    public static AuthResponse success(String token, long expiresIn, String userId,
                                       String name, String email, List<String> roles) {
        return AuthResponse.builder()
                .token(token)
                .tokenType("Bearer")
                .expiresIn(expiresIn)
                .userId(userId)
                .name(name)
                .email(email)
                .roles(roles)
                .success(true)
                .message("Authentication successful")
                .build();
    }

    public static AuthResponse failure(String message) {
        return AuthResponse.builder()
                .success(false)
                .message(message)
                .build();
    }
}
