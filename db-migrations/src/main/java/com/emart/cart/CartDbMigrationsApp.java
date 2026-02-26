package com.emart.cart;

import io.mongock.runner.springboot.EnableMongock;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * DB Migration Runner - Cart Service
 * This minimal Spring Boot app runs ONLY Mongock migrations then exits.
 * Used by DB Team's Jenkins pipeline.
 */
@SpringBootApplication
@EnableMongock
public class CartDbMigrationsApp {
    public static void main(String[] args) {
        // Run migrations and exit (non-web app)
        SpringApplication.run(CartDbMigrationsApp.class, args);
        System.out.println("[DB-TEAM] Cart DB migrations completed.");
        System.exit(0);
    }
}
