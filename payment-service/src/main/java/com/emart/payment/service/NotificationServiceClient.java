package com.emart.payment.service;

import com.emart.payment.dto.CartItemSnapshot;
import com.emart.payment.dto.ShippingAddress;
import com.emart.payment.model.Order;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;

/**
 * Fire-and-forget HTTP client for the Notification Service (Node.js, :8088).
 *
 * Called after payment success/failure. Uses WebClient (non-blocking) + @Async.
 * All exceptions are caught and logged — email errors NEVER break the order flow.
 *
 * Config (add to payment.env):
 *   NOTIFICATION_SERVICE_URL=http://localhost:8088
 *   NOTIFICATION_SERVICE_SECRET=<same value as notification.env SERVICE_SECRET>
 */
@Service
@Slf4j
public class NotificationServiceClient {

    private final WebClient    webClient;
    private final ObjectMapper objectMapper;
    private final String       serviceSecret;

    public NotificationServiceClient(
            @Value("${app.notification-service.base-url:http://localhost:8088}") String baseUrl,
            @Value("${app.notification-service.service-secret:}")               String serviceSecret,
            ObjectMapper objectMapper) {
        this.serviceSecret = serviceSecret;
        this.objectMapper  = objectMapper;
        this.webClient = WebClient.builder()
            .baseUrl(baseUrl)
            .defaultHeader(HttpHeaders.CONTENT_TYPE, "application/json")
            .build();
    }

    /** Sends order confirmation email after successful payment. */
    @Async
    public void sendOrderConfirmed(Order order, List<CartItemSnapshot> items,
                                    ShippingAddress shippingAddress) {
        try {
            Map<String, Object> payload = buildConfirmedPayload(order, items, shippingAddress);
            post("/api/v1/notify/order-confirmed", payload);
            log.info("Order confirmation email queued for {}", order.getUserEmail());
        } catch (Exception e) {
            log.warn("Notification skipped for order {} — {}", order.getOrderNumber(), e.getMessage());
        }
    }

    /** Sends payment failure email. */
    @Async
    public void sendOrderFailed(Order order) {
        try {
            Map<String, Object> payload = Map.of(
                "userEmail",   order.getUserEmail(),
                "userName",    order.getUserName() != null ? order.getUserName() : "Customer",
                "orderNumber", order.getOrderNumber()
            );
            post("/api/v1/notify/order-failed", payload);
            log.info("Payment failure email queued for {}", order.getUserEmail());
        } catch (Exception e) {
            log.warn("Notification skipped for order {} — {}", order.getOrderNumber(), e.getMessage());
        }
    }

    // ─────────────────────────────────────────────────────────
    private void post(String path, Object payload) {
        WebClient.RequestBodySpec req = webClient.post().uri(path);
        if (serviceSecret != null && !serviceSecret.isBlank()) {
            req = req.header("X-Service-Secret", serviceSecret);
        }
        req.bodyValue(payload)
            .retrieve()
            .toBodilessEntity()
            .subscribe(
                r  -> {},
                ex -> log.warn("Notification POST {} failed: {}", path, ex.getMessage())
            );
    }

    private Map<String, Object> buildConfirmedPayload(Order order,
            List<CartItemSnapshot> items, ShippingAddress shippingAddress) {
        Map<String, Object> p = new LinkedHashMap<>();
        p.put("userEmail",     order.getUserEmail());
        p.put("userName",      order.getUserName() != null ? order.getUserName() : "Customer");
        p.put("orderNumber",   order.getOrderNumber());
        p.put("totalAmount",   order.getTotalAmount());
        p.put("subtotal",      order.getSubtotal());
        p.put("tax",           order.getTaxAmount());
        p.put("shipping",      order.getShippingFee());
        p.put("paymentMethod", order.getPaymentMethod() != null
            ? order.getPaymentMethod().name().replace("_", " ") : "");
        p.put("transactionId", order.getTransactionId());

        if (items != null) {
            List<Map<String, Object>> itemList = new ArrayList<>();
            for (CartItemSnapshot item : items) {
                Map<String, Object> i = new LinkedHashMap<>();
                i.put("productName", item.getProductName());
                i.put("category",    item.getCategory());
                i.put("quantity",    item.getQuantity());
                i.put("price",       item.getPrice());
                i.put("subtotal",    item.getSubtotal());
                itemList.add(i);
            }
            p.put("items", itemList);
        }

        if (shippingAddress != null) {
            Map<String, String> addr = new LinkedHashMap<>();
            addr.put("fullName", shippingAddress.getFullName());
            addr.put("line1",    shippingAddress.getLine1());
            addr.put("line2",    shippingAddress.getLine2() != null ? shippingAddress.getLine2() : "");
            addr.put("city",     shippingAddress.getCity());
            addr.put("state",    shippingAddress.getState());
            addr.put("pinCode",  shippingAddress.getPinCode());
            p.put("shippingAddress", addr);
        }

        return p;
    }
}
