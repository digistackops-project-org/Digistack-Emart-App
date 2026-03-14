package com.emart.payment.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.Key;

/**
 * JWT validation service.
 * Uses the SAME secret as the Login Service — we only VERIFY, never issue tokens.
 * The secret comes from JWT_SECRET env var → application.yml → this bean.
 */
@Service
@Slf4j
public class JwtService {

    private final Key signingKey;

    public JwtService(@Value("${app.jwt.secret}") String secret) {
        if (secret == null || secret.isBlank()) {
            throw new IllegalStateException(
                "JWT_SECRET env var is not set. " +
                "It must match the secret used by the Login Service."
            );
        }
        this.signingKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    /**
     * Parse and validate a JWT token string.
     * Throws JwtException subtypes on any failure:
     *   ExpiredJwtException   → 401 "Token expired"
     *   MalformedJwtException → 401 "Invalid token"
     *   SignatureException    → 401 "Invalid signature"
     */
    public Claims validateAndExtract(String token) {
        return Jwts.parserBuilder()
                   .setSigningKey(signingKey)
                   .build()
                   .parseClaimsJws(token)
                   .getBody();
    }

    public String extractUserId(Claims claims) {
        return claims.get("userId", String.class);
    }

    public String extractEmail(Claims claims) {
        return claims.getSubject();   // Login Service sets sub=email
    }

    public String extractName(Claims claims) {
        return claims.get("name", String.class);
    }
}
