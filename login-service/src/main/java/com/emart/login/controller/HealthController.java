package com.emart.login.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@Slf4j
public class HealthController {

    private final MongoTemplate mongoTemplate;

    private static final String APP_NAME    = "emart-login-service";
    private static final String APP_VERSION = "1.0.0";

    /**
     * GET /health
     * General health check - service is running.
     * Used by: Load Balancer, Reverse Proxy
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        Map<String, Object> response = buildBase("UP");
        return ResponseEntity.ok(response);
    }

    /**
     * GET /health/live
     * Kubernetes Liveness Probe.
     * Returns 200 if the application process is alive.
     * Return 503 if the app is in a broken state and needs restart.
     */
    @GetMapping("/health/live")
    public ResponseEntity<Map<String, Object>> liveness() {
        Map<String, Object> response = buildBase("UP");
        response.put("probe", "liveness");
        response.put("description", "Application process is alive");
        return ResponseEntity.ok(response);
    }

    /**
     * GET /health/ready
     * Kubernetes Readiness Probe.
     * Returns 200 only when app is ready to serve traffic (DB connected etc.)
     * Returns 503 if not ready (during startup, or if DB is down).
     */
    @GetMapping("/health/ready")
    public ResponseEntity<Map<String, Object>> readiness() {
        Map<String, Object> response = buildBase(null);
        response.put("probe", "readiness");

        // Check MongoDB connectivity
        Map<String, String> checks = new HashMap<>();
        boolean allHealthy = true;

        try {
            mongoTemplate.getDb().getName();
            checks.put("mongodb", "UP");
        } catch (Exception e) {
            log.error("MongoDB health check failed: {}", e.getMessage());
            checks.put("mongodb", "DOWN - " + e.getMessage());
            allHealthy = false;
        }

        String overallStatus = allHealthy ? "UP" : "DOWN";
        response.put("status", overallStatus);
        response.put("checks", checks);
        response.put("description", allHealthy
                ? "Application is ready to serve traffic"
                : "Application is NOT ready - dependencies unavailable");

        return allHealthy
                ? ResponseEntity.ok(response)
                : ResponseEntity.status(503).body(response);
    }

    private Map<String, Object> buildBase(String status) {
        Map<String, Object> response = new HashMap<>();
        if (status != null) response.put("status", status);
        response.put("service", APP_NAME);
        response.put("version", APP_VERSION);
        response.put("timestamp", LocalDateTime.now().toString());
        return response;
    }
}
