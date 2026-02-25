package com.emart.login.migration;

import com.mongodb.client.MongoDatabase;
import com.mongodb.client.model.IndexOptions;
import com.mongodb.client.model.Indexes;
import io.mongock.api.annotations.ChangeUnit;
import io.mongock.api.annotations.Execution;
import io.mongock.api.annotations.RollbackExecution;
import lombok.extern.slf4j.Slf4j;
import org.bson.Document;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.index.Index;
import org.springframework.data.domain.Sort;

import java.time.LocalDateTime;

/**
 * Mongock Migration: V001 - Create users collection with indexes
 * 
 * Database: userdb
 * Collection: users
 * 
 * This migration creates:
 *   1. The 'users' collection
 *   2. Unique index on email
 *   3. Unique index on phone
 *   4. Compound index on email + enabled (for active user lookups)
 *   5. Index on createdAt (for reporting)
 */
@ChangeUnit(id = "V001_CreateUsersCollection", order = "001", author = "emart-db-team")
@Slf4j
public class V001_CreateUsersCollection {

    @Execution
    public void execute(MongoTemplate mongoTemplate) {
        log.info("Executing migration V001: Creating users collection and indexes");

        // Create collection if it doesn't exist
        MongoDatabase db = mongoTemplate.getDb();
        if (!mongoTemplate.collectionExists("users")) {
            mongoTemplate.createCollection("users");
            log.info("Created 'users' collection in userdb");
        }

        // Unique index on email
        mongoTemplate.indexOps("users").ensureIndex(
            new Index().on("email", Sort.Direction.ASC).unique().named("idx_email_unique")
        );

        // Unique index on phone
        mongoTemplate.indexOps("users").ensureIndex(
            new Index().on("phone", Sort.Direction.ASC).unique().named("idx_phone_unique")
        );

        // Compound index for active user queries
        mongoTemplate.indexOps("users").ensureIndex(
            new Index()
                .on("email", Sort.Direction.ASC)
                .on("enabled", Sort.Direction.ASC)
                .named("idx_email_enabled")
        );

        // Index on createdAt for date range queries
        mongoTemplate.indexOps("users").ensureIndex(
            new Index().on("created_at", Sort.Direction.DESC).named("idx_created_at")
        );

        // Index on locked + enabled for admin queries
        mongoTemplate.indexOps("users").ensureIndex(
            new Index()
                .on("locked", Sort.Direction.ASC)
                .on("enabled", Sort.Direction.ASC)
                .named("idx_locked_enabled")
        );

        log.info("V001 migration completed: users collection and indexes created");
    }

    @RollbackExecution
    public void rollback(MongoTemplate mongoTemplate) {
        log.warn("Rolling back V001: Dropping users collection");
        if (mongoTemplate.collectionExists("users")) {
            mongoTemplate.dropCollection("users");
            log.info("Dropped 'users' collection during rollback");
        }
    }
}
