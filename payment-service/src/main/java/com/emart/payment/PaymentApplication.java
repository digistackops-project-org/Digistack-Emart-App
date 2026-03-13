package com.emart.payment;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

/**
 * Emart Payment & Checkout Service — Phase 5
 *
 * Responsibilities:
 *  - Accept checkout requests (items + shipping address + payment method)
 *  - Create orders in PostgreSQL paymentdb
 *  - Process payments (simulated in this phase, plug in Razorpay/Stripe later)
 *  - Clear the user's cart in Cart Service after successful payment
 *  - Expose order history per user
 *
 * Port:   :8084  (Nginx prefix: /payment-api/)
 * DB:     PostgreSQL paymentdb
 * JWT:    Shared secret with Login Service (validates incoming tokens)
 */
@SpringBootApplication
@EnableAsync
public class PaymentApplication {

    public static void main(String[] args) {
        SpringApplication.run(PaymentApplication.class, args);
    }
}
