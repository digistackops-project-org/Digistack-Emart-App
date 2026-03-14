package com.emart.payment.service;

import com.emart.payment.model.Order;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;

/**
 * Simulated payment processor.
 *
 * In production Phase 2, replace simulateGatewayCall() with real
 * Razorpay / Stripe / PayU SDK calls. The interface stays the same.
 *
 * Test card numbers:
 *   SUCCESS:  4111111111111111 (Visa test)
 *   FAILURE:  4000000000000002 (decline simulation)
 *   SUCCESS:  5500005555555559 (Mastercard test)
 *
 * UPI:
 *   SUCCESS:  any valid format xxx@bankcode
 *   FAILURE:  fail@upi
 *
 * COD / Net Banking / Wallet: always succeed in simulation.
 */
@Service
@Slf4j
public class PaymentProcessorService {

    @Value("${app.payment.simulation-enabled:true}")
    private boolean simulationEnabled;

    @Value("${app.payment.success-rate:0.95}")
    private double successRate;

    /** Result of a gateway call. */
    public record GatewayResult(
        boolean success,
        String transactionId,
        String failureReason,
        String maskedDetail,
        String gatewayResponseJson
    ) {}

    /**
     * Process payment using the given method and details.
     * Returns GatewayResult — caller maps this to Payment entity.
     */
    public GatewayResult process(
            Order.PaymentMethod method,
            BigDecimal amount,
            String currency,
            Map<String, String> details) {

        log.info("Processing {} payment of {} {}", method, amount, currency);

        return switch (method) {
            case CARD         -> processCard(details, amount);
            case UPI          -> processUpi(details, amount);
            case NET_BANKING  -> processNetBanking(details, amount);
            case WALLET       -> processWallet(details, amount);
            case COD          -> processCod(amount);
        };
    }

    // ── COD — always succeeds ─────────────────────────────────
    private GatewayResult processCod(BigDecimal amount) {
        String txId = "COD-" + UUID.randomUUID().toString().substring(0, 12).toUpperCase();
        return new GatewayResult(
            true, txId, null, "Cash on Delivery",
            buildGatewayResponse("COD", "success", txId, null)
        );
    }

    // ── Card payment ──────────────────────────────────────────
    private GatewayResult processCard(Map<String, String> details, BigDecimal amount) {
        String cardNumber = details.getOrDefault("cardNumber", "").replaceAll("\\s", "");
        String masked     = maskCard(cardNumber);

        // Decline test card
        if (cardNumber.startsWith("4000000000000002")) {
            return decline("CARD", masked, "Card declined by issuing bank");
        }
        // Insufficient funds simulation
        if (cardNumber.startsWith("4000000000009995")) {
            return decline("CARD", masked, "Insufficient funds");
        }

        String txId = "CARD-" + UUID.randomUUID().toString().substring(0, 16).toUpperCase();
        return new GatewayResult(
            true, txId, null, masked,
            buildGatewayResponse("CARD", "captured", txId, masked)
        );
    }

    // ── UPI payment ───────────────────────────────────────────
    private GatewayResult processUpi(Map<String, String> details, BigDecimal amount) {
        String upiId = details.getOrDefault("upiId", "");

        if (!upiId.matches("^[a-zA-Z0-9.\\-_+]+@[a-zA-Z]{3,}$")) {
            return decline("UPI", upiId, "Invalid UPI ID format");
        }
        if (upiId.equalsIgnoreCase("fail@upi")) {
            return decline("UPI", upiId, "UPI transaction declined");
        }

        String txId = "UPI-" + UUID.randomUUID().toString().substring(0, 14).toUpperCase();
        return new GatewayResult(
            true, txId, null, upiId,
            buildGatewayResponse("UPI", "success", txId, upiId)
        );
    }

    // ── Net Banking ───────────────────────────────────────────
    private GatewayResult processNetBanking(Map<String, String> details, BigDecimal amount) {
        String bankName = details.getOrDefault("bankName", "Unknown Bank");
        String txId     = "NB-" + UUID.randomUUID().toString().substring(0, 14).toUpperCase();
        return new GatewayResult(
            true, txId, null, bankName,
            buildGatewayResponse("NET_BANKING", "success", txId, bankName)
        );
    }

    // ── Wallet ────────────────────────────────────────────────
    private GatewayResult processWallet(Map<String, String> details, BigDecimal amount) {
        String walletType = details.getOrDefault("walletType", "Wallet");
        String txId       = "WALLET-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase();
        return new GatewayResult(
            true, txId, null, walletType,
            buildGatewayResponse("WALLET", "success", txId, walletType)
        );
    }

    // ── Helpers ───────────────────────────────────────────────
    private GatewayResult decline(String method, String detail, String reason) {
        String txId = "FAIL-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase();
        return new GatewayResult(
            false, txId, reason, detail,
            buildGatewayResponse(method, "declined", txId, reason)
        );
    }

    private String maskCard(String cardNumber) {
        if (cardNumber == null || cardNumber.length() < 4) return "****";
        return "**** **** **** " + cardNumber.substring(cardNumber.length() - 4);
    }

    private String buildGatewayResponse(String method, String status, String txId, String detail) {
        return String.format(
            "{\"gateway\":\"emart-sim\",\"method\":\"%s\",\"status\":\"%s\"," +
            "\"transaction_id\":\"%s\",\"detail\":\"%s\",\"processed_at\":\"%s\"}",
            method, status, txId,
            detail == null ? "" : detail.replace("\"", "'"),
            Instant.now()
        );
    }
}
