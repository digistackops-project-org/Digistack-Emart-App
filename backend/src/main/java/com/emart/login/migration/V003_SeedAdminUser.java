package com.emart.login.migration;

import com.emart.login.model.User;
import io.mongock.api.annotations.ChangeUnit;
import io.mongock.api.annotations.Execution;
import io.mongock.api.annotations.RollbackExecution;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.util.List;

/**
 * Mongock Migration: V003 - Seed default admin user
 * Creates the initial system admin account.
 * NOTE: Change admin password immediately after first login in production!
 */
@ChangeUnit(id = "V003_SeedAdminUser", order = "003", author = "emart-db-team")
@Slf4j
public class V003_SeedAdminUser {

    @Execution
    public void execute(MongoTemplate mongoTemplate) {
        log.info("Executing migration V003: Seeding default admin user");

        String adminEmail = "admin@emart.com";
        
        // Check if admin already exists (idempotent)
        boolean exists = mongoTemplate.exists(
            Query.query(Criteria.where("email").is(adminEmail)), User.class);
        
        if (exists) {
            log.info("Admin user already exists, skipping seed");
            return;
        }

        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder(12);

        User admin = User.builder()
                .name("Emart Admin")
                .email(adminEmail)
                .phone("+10000000000")
                .password(encoder.encode("Admin@Emart#2024")) // MUST change in production
                .city("Headquarters")
                .enabled(true)
                .emailVerified(true)
                .roles(List.of("ROLE_ADMIN", "ROLE_USER"))
                .schemaVersion(1)
                .build();

        mongoTemplate.save(admin, "users");
        log.info("V003 migration completed: Admin user seeded with email: {}", adminEmail);
        log.warn("IMPORTANT: Change the admin password immediately in production!");
    }

    @RollbackExecution
    public void rollback(MongoTemplate mongoTemplate) {
        log.warn("Rolling back V003: Removing seeded admin user");
        mongoTemplate.remove(
            Query.query(Criteria.where("email").is("admin@emart.com")),
            User.class
        );
    }
}
