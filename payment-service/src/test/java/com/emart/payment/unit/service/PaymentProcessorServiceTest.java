package com.emart.payment.unit.service;

import com.emart.payment.model.Order;
import com.emart.payment.service.PaymentProcessorService;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.util.Map;

import static org.assertj.core.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
@ActiveProfiles("test")
@Tag("unit")
class PaymentProcessorServiceTest {

    @Autowired PaymentProcessorService processor;

    // ── COD always succeeds ───────────────────────────────────
    @Test
    @DisplayName("COD payment → always SUCCESS")
    void cod_alwaysSucceeds() {
        var result = processor.process(
            Order.PaymentMethod.COD, new BigDecimal("500"), "INR", Map.of());
        assertThat(result.success()).isTrue();
        assertThat(result.transactionId()).startsWith("COD-");
        assertThat(result.maskedDetail()).isEqualTo("Cash on Delivery");
    }

    // ── Card — success path ───────────────────────────────────
    @Test
    @DisplayName("Valid Visa test card → SUCCESS with masked number")
    void card_validVisa_succeeds() {
        var result = processor.process(
            Order.PaymentMethod.CARD, new BigDecimal("1295"), "INR",
            Map.of("cardNumber", "4111111111111111", "cardHolder", "Test User"));
        assertThat(result.success()).isTrue();
        assertThat(result.transactionId()).startsWith("CARD-");
        assertThat(result.maskedDetail()).isEqualTo("**** **** **** 1111");
    }

    // ── Card — decline test numbers ───────────────────────────
    @ParameterizedTest(name = "Decline card: {0}")
    @ValueSource(strings = {"4000000000000002", "4000000000009995"})
    @DisplayName("Decline-trigger card numbers → FAILED")
    void card_declineTriggers_fail(String cardNumber) {
        var result = processor.process(
            Order.PaymentMethod.CARD, new BigDecimal("999"), "INR",
            Map.of("cardNumber", cardNumber));
        assertThat(result.success()).isFalse();
        assertThat(result.failureReason()).isNotBlank();
    }

    // ── UPI ───────────────────────────────────────────────────
    @Test
    @DisplayName("Valid UPI ID → SUCCESS")
    void upi_validFormat_succeeds() {
        var result = processor.process(
            Order.PaymentMethod.UPI, new BigDecimal("500"), "INR",
            Map.of("upiId", "user@okaxis"));
        assertThat(result.success()).isTrue();
        assertThat(result.transactionId()).startsWith("UPI-");
        assertThat(result.maskedDetail()).isEqualTo("user@okaxis");
    }

    @Test
    @DisplayName("fail@upi → FAILED")
    void upi_failTrigger_fails() {
        var result = processor.process(
            Order.PaymentMethod.UPI, new BigDecimal("500"), "INR",
            Map.of("upiId", "fail@upi"));
        assertThat(result.success()).isFalse();
        assertThat(result.failureReason()).contains("declined");
    }

    @Test
    @DisplayName("Invalid UPI format → FAILED")
    void upi_invalidFormat_fails() {
        var result = processor.process(
            Order.PaymentMethod.UPI, new BigDecimal("500"), "INR",
            Map.of("upiId", "not-a-upi-id"));
        assertThat(result.success()).isFalse();
    }

    // ── Net Banking & Wallet ──────────────────────────────────
    @Test
    @DisplayName("Net Banking → SUCCESS")
    void netBanking_succeeds() {
        var result = processor.process(
            Order.PaymentMethod.NET_BANKING, new BigDecimal("2000"), "INR",
            Map.of("bankName", "HDFC Bank"));
        assertThat(result.success()).isTrue();
        assertThat(result.maskedDetail()).isEqualTo("HDFC Bank");
    }

    @Test
    @DisplayName("Wallet → SUCCESS")
    void wallet_succeeds() {
        var result = processor.process(
            Order.PaymentMethod.WALLET, new BigDecimal("300"), "INR",
            Map.of("walletType", "Paytm"));
        assertThat(result.success()).isTrue();
        assertThat(result.maskedDetail()).isEqualTo("Paytm");
    }

    // ── Gateway response always populated ────────────────────
    @Test
    @DisplayName("All methods return non-null gatewayResponseJson")
    void allMethods_returnGatewayResponse() {
        for (var method : Order.PaymentMethod.values()) {
            var result = processor.process(
                method, BigDecimal.TEN, "INR",
                Map.of("upiId", "x@upi", "bankName", "SBI", "walletType", "Paytm"));
            assertThat(result.gatewayResponseJson()).isNotBlank();
            assertThat(result.gatewayResponseJson()).contains("emart-sim");
        }
    }
}
