package com.emart.payment.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Three health endpoints — NO authentication required.
 *
 * GET /health        → process alive check
 * GET /health/live   → liveness probe (K8s: restart if fails)
 * GET /health/ready  → readiness probe (K8s: remove from LB if fails)
 */
@RestController
@RequiredArgsConstructor
@Slf4j
public class HealthController {

    private final JdbcTemplate jdbcTemplate;

    @Value("${spring.application.name:emart-payment-service}")
    private String serviceName;

    @Value("${app.version:1.0.0}")
    private String version;

    // ── GET /health ───────────────────────────────────────────
    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        return ResponseEntity.ok(Map.of(
            "status",    "UP",
            "service",   serviceName,
            "version",   version,
            "message",   "Payment service is running",
            "timestamp", Instant.now().toString()
        ));
    }

    // ── GET /health/live ──────────────────────────────────────
    @GetMapping("/health/live")
    public ResponseEntity<Map<String, Object>> liveness() {
        return ResponseEntity.ok(Map.of(
            "status",    "UP",
            "probe",     "liveness",
            "service",   serviceName,
            "message",   "Application process is alive",
            "timestamp", Instant.now().toString()
        ));
    }

    // ── GET /health/ready ─────────────────────────────────────
    @GetMapping("/health/ready")
    public ResponseEntity<Map<String, Object>> readiness() {
        Map<String, Object> checks  = new LinkedHashMap<>();
        boolean             healthy = true;

        // PostgreSQL connectivity check
        try {
            jdbcTemplate.queryForObject("SELECT 1", Integer.class);
            checks.put("postgresql", "UP");
        } catch (Exception ex) {
            log.error("Readiness: PostgreSQL check failed: {}", ex.getMessage());
            checks.put("postgresql", "DOWN");
            healthy = false;
        }

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("status",    healthy ? "UP" : "DOWN");
        body.put("probe",     "readiness");
        body.put("service",   serviceName);
        body.put("message",   healthy
            ? "Application is ready to serve traffic"
            : "Application is NOT ready — dependencies unavailable");
        body.put("checks",    checks);
        body.put("timestamp", Instant.now().toString());

        return ResponseEntity.status(healthy ? 200 : 503).body(body);
    }
}
