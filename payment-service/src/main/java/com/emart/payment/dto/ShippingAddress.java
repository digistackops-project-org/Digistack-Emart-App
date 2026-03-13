package com.emart.payment.dto;

import jakarta.validation.constraints.*;
import lombok.*;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class ShippingAddress {

    @NotBlank(message = "Full name is required")
    @Size(max = 150, message = "Name too long")
    private String fullName;

    @NotBlank(message = "Address line 1 is required")
    @Size(max = 255)
    private String addressLine1;

    @Size(max = 255)
    private String addressLine2;

    @NotBlank(message = "City is required")
    @Size(max = 100)
    private String city;

    @NotBlank(message = "State is required")
    @Size(max = 100)
    private String state;

    @NotBlank(message = "PIN code is required")
    @Pattern(regexp = "^[1-9][0-9]{5}$", message = "Invalid Indian PIN code (must be 6 digits)")
    private String pinCode;

    @Builder.Default
    private String country = "India";

    @Pattern(regexp = "^[6-9]\\d{9}$", message = "Invalid Indian mobile (10 digits starting 6-9)")
    private String phone;
}
