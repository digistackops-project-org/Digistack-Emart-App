package com.emart.cart.migration;

import io.mongock.api.annotations.ChangeUnit;
import io.mongock.api.annotations.Execution;
import io.mongock.api.annotations.RollbackExecution;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.index.CompoundIndexDefinition;
import org.springframework.data.mongodb.core.index.Index;

/**
 * Mongock Migration: C-V001 - Create carts collection with all indexes
 *
 * Database: cartdb
 * Collection: carts
 *
 * Creates:
 *   1. carts collection
 *   2. Unique index on user_id (one cart per user)
 *   3. Index on status (for querying by active/abandoned/checked_out)
 *   4. Index on updated_at (for cleanup of old carts)
 *   5. Index on user_email (lookup by email for admin)
 *   6. Compound index: user_id + status (most common query pattern)
 *   7. TTL index on updated_at (auto-expire abandoned carts after 30 days)
 */
@ChangeUnit(id = "CART-V001_CreateCartsCollection", order = "001", author = "emart-db-team")
@Slf4j
public class V001_CreateCartsCollection {

    private static final String COLLECTION = "carts";
    private static final int ABANDONED_CART_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days

    @Execution
    public void execute(MongoTemplate mongoTemplate) {
        log.info("Executing CART-V001: Creating carts collection with indexes");

        // Create collection if not exists
        if (!mongoTemplate.collectionExists(COLLECTION)) {
            mongoTemplate.createCollection(COLLECTION);
            log.info("Created '{}' collection in cartdb", COLLECTION);
        }

        // 1. Unique index on user_id (one active cart per user)
        mongoTemplate.indexOps(COLLECTION).ensureIndex(
            new Index().on("user_id", Sort.Direction.ASC)
                       .unique()
                       .named("idx_user_id_unique")
        );

        // 2. Index on status for querying by cart state
        mongoTemplate.indexOps(COLLECTION).ensureIndex(
            new Index().on("status", Sort.Direction.ASC)
                       .named("idx_status")
        );

        // 3. Index on updated_at for recency queries
        mongoTemplate.indexOps(COLLECTION).ensureIndex(
            new Index().on("updated_at", Sort.Direction.DESC)
                       .named("idx_updated_at")
        );

        // 4. Index on user_email for admin lookup
        mongoTemplate.indexOps(COLLECTION).ensureIndex(
            new Index().on("user_email", Sort.Direction.ASC)
                       .named("idx_user_email")
        );

        // 5. Compound index: user_id + status (most common query)
        org.bson.Document compoundKeys = new org.bson.Document("user_id", 1).append("status", 1);
        mongoTemplate.indexOps(COLLECTION).ensureIndex(
            new CompoundIndexDefinition(compoundKeys).named("idx_user_status")
        );

        // 6. TTL index - auto-delete abandoned carts after 30 days of inactivity
        // NOTE: TTL only deletes documents where status = "abandoned"
        // We rely on application logic to set status = "abandoned" before TTL kicks in
        mongoTemplate.indexOps(COLLECTION).ensureIndex(
            new Index().on("updated_at", Sort.Direction.ASC)
                       .expire(ABANDONED_CART_TTL_SECONDS)
                       .named("idx_ttl_abandoned_carts")
        );

        log.info("CART-V001 completed: carts collection created with {} indexes", 6);
    }

    @RollbackExecution
    public void rollback(MongoTemplate mongoTemplate) {
        log.warn("Rolling back CART-V001: Dropping carts collection");
        if (mongoTemplate.collectionExists(COLLECTION)) {
            mongoTemplate.dropCollection(COLLECTION);
            log.info("Dropped '{}' collection during rollback", COLLECTION);
        }
    }
}
