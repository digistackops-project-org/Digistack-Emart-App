package com.emart.payment.dto;

import lombok.*;
import java.time.Instant;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class ApiResponse<T> {
    private boolean success;
    private String  message;
    private T       data;
    private Instant timestamp;

    public static <T> ApiResponse<T> ok(T data, String message) {
        return ApiResponse.<T>builder()
                .success(true).message(message).data(data)
                .timestamp(Instant.now()).build();
    }

    public static <T> ApiResponse<T> fail(String message) {
        return ApiResponse.<T>builder()
                .success(false).message(message)
                .timestamp(Instant.now()).build();
    }
}
