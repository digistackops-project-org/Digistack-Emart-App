package com.emart.payment.dto;

import lombok.*;

/**
 * Payment method-specific details — only the relevant fields are populated.
 * Card number is never stored raw — only last 4 digits are kept.
 */
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class PaymentDetails {
    // CARD payments
    private String cardNumber;   // Full number from UI — last 4 retained only
    private String cardHolder;
    private String cardExpiry;   // MM/YY

    // UPI
    private String upiId;        // e.g. user@okaxis

    // NET_BANKING
    private String bankName;     // e.g. "State Bank of India"

    // WALLET
    private String walletType;   // e.g. "Paytm", "PhonePe"
}
