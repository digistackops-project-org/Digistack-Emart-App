package com.emart.login.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "users")
public class User {

    @Id
    private String id;

    @Field("name")
    private String name;

    @Field("email")
    @Indexed(unique = true)
    private String email;

    @Field("phone")
    @Indexed(unique = true)
    private String phone;

    @Field("password")
    private String password;

    @Field("city")
    private String city;

    @Field("roles")
    @Builder.Default
    private List<String> roles = List.of("ROLE_USER");

    @Field("enabled")
    @Builder.Default
    private boolean enabled = true;

    @Field("email_verified")
    @Builder.Default
    private boolean emailVerified = false;

    @Field("login_attempts")
    @Builder.Default
    private int loginAttempts = 0;

    @Field("locked")
    @Builder.Default
    private boolean locked = false;

    @Field("last_login")
    private LocalDateTime lastLogin;

    @CreatedDate
    @Field("created_at")
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Field("updated_at")
    private LocalDateTime updatedAt;

    @Field("schema_version")
    @Builder.Default
    private int schemaVersion = 1;
}
