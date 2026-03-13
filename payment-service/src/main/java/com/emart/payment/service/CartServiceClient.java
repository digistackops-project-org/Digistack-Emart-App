package com.emart.payment.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.emart.payment.dto.CartItemSnapshot;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import reactor.core.publisher.Mono;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/**
 * HTTP client for the Cart Service (Go, :8081).
 * Responsibilities:
 *   1. Fetch user's cart to snapshot items at checkout time
 *   2. Clear the cart after successful payment
 *
 * Uses the user's JWT token (passed through from checkout request).
 * If Cart Service is down, checkout gracefully degrades.
 */
@Service
@Slf4j
public class CartServiceClient {

    private final WebClient webClient;
    private final ObjectMapper objectMapper;

    public CartServiceClient(
            @Value("${app.cart-service.base-url}") String cartBaseUrl,
            ObjectMapper objectMapper) {
        this.webClient = WebClient.builder()
            .baseUrl(cartBaseUrl)
            .defaultHeader("Content-Type", "application/json")
            .build();
        this.objectMapper = objectMapper;
    }

    /**
     * Fetch the user's cart from Cart Service.
     * Returns empty list if cart is unavailable (fail-safe).
     */
    public List<CartItemSnapshot> fetchCartItems(String jwtToken) {
        try {
            String responseBody = webClient.get()
                .uri("/api/v1/cart")
                .header("Authorization", "Bearer " + jwtToken)
                .retrieve()
                .bodyToMono(String.class)
                .block();

            if (responseBody == null) return List.of();

            JsonNode root  = objectMapper.readTree(responseBody);
            JsonNode items = root.path("data").path("items");

            List<CartItemSnapshot> snapshots = new ArrayList<>();
            if (items.isArray()) {
                for (JsonNode item : items) {
                    BigDecimal price = new BigDecimal(item.path("price").asText("0"));
                    int qty          = item.path("quantity").asInt(1);
                    snapshots.add(CartItemSnapshot.builder()
                        .itemId(item.path("item_id").asText())
                        .productId(item.path("product_id").asText())
                        .productName(item.path("product_name").asText())
                        .category(item.path("category").asText())
                        .price(price)
                        .quantity(qty)
                        .subtotal(price.multiply(BigDecimal.valueOf(qty)))
                        .build());
                }
            }
            log.info("Fetched {} cart items for checkout", snapshots.size());
            return snapshots;

        } catch (WebClientResponseException ex) {
            log.warn("Cart Service returned {} when fetching cart: {}",
                     ex.getStatusCode(), ex.getMessage());
            return List.of();
        } catch (Exception ex) {
            log.error("Error fetching cart items: {}", ex.getMessage());
            return List.of();
        }
    }

    /**
     * Clear the user's cart in Cart Service after successful payment.
     * Fire-and-forget — if it fails, the order is still successful.
     */
    public void clearCart(String jwtToken) {
        webClient.delete()
            .uri("/api/v1/cart")
            .header("Authorization", "Bearer " + jwtToken)
            .retrieve()
            .toBodilessEntity()
            .subscribe(
                resp -> log.info("Cart cleared after successful payment"),
                err  -> log.warn("Could not clear cart (non-critical): {}", err.getMessage())
            );
    }
}
