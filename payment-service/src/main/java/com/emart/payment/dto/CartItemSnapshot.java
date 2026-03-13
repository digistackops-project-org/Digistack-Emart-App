package com.emart.payment.dto;

import lombok.*;
import java.math.BigDecimal;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class CartItemSnapshot {
    private String itemId;
    private String productId;
    private String productName;
    private String category;
    private BigDecimal price;
    private Integer quantity;
    private BigDecimal subtotal;
}
