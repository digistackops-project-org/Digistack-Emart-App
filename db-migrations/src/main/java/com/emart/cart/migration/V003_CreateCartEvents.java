package com.emart.cart.migration;

import io.mongock.api.annotations.ChangeUnit;
import io.mongock.api.annotations.Execution;
import io.mongock.api.annotations.RollbackExecution;
import lombok.extern.slf4j.Slf4j;
import org.bson.Document;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.index.CompoundIndexDefinition;
import org.springframework.data.mongodb.core.index.Index;

/**
 * Mongock Migration: CART-V003 - Create cart_events collection for analytics
 *
 * This collection tracks cart events (item_added, item_removed, cart_checked_out)
 * for analytics and reporting. Used by future analytics microservice.
 *
 * Also adds last_sync_at index to carts for sync service monitoring.
 */
@ChangeUnit(id = "CART-V003_CreateCartEvents", order = "003", author = "emart-db-team")
@Slf4j
public class V003_CreateCartEvents {

    private static final String CARTS_COLLECTION = "carts";
    private static final String EVENTS_COLLECTION = "cart_events";

    @Execution
    public void execute(MongoTemplate mongoTemplate) {
        log.info("Executing CART-V003: Creating cart_events collection and adding sync indexes");

        // 1. Create cart_events collection
        if (!mongoTemplate.collectionExists(EVENTS_COLLECTION)) {
            mongoTemplate.createCollection(EVENTS_COLLECTION);
            log.info("Created '{}' collection", EVENTS_COLLECTION);
        }

        // 2. Index on cart_events.user_id
        mongoTemplate.indexOps(EVENTS_COLLECTION).ensureIndex(
            new Index().on("user_id", Sort.Direction.ASC).named("idx_events_user_id")
        );

        // 3. Index on cart_events.event_type
        mongoTemplate.indexOps(EVENTS_COLLECTION).ensureIndex(
            new Index().on("event_type", Sort.Direction.ASC).named("idx_events_type")
        );

        // 4. Compound: user_id + event_type + created_at for analytics queries
        org.bson.Document compoundKeys = new org.bson.Document("user_id", 1)
            .append("event_type", 1)
            .append("created_at", -1);
        mongoTemplate.indexOps(EVENTS_COLLECTION).ensureIndex(
            new CompoundIndexDefinition(compoundKeys).named("idx_events_user_type_date")
        );

        // 5. TTL on cart_events - auto-delete after 90 days
        mongoTemplate.indexOps(EVENTS_COLLECTION).ensureIndex(
            new Index().on("created_at", Sort.Direction.ASC)
                       .expire(90 * 24 * 60 * 60)
                       .named("idx_events_ttl_90d")
        );

        // 6. Add last_sync_at index to carts collection (for sync monitoring)
        mongoTemplate.indexOps(CARTS_COLLECTION).ensureIndex(
            new Index().on("last_sync_at", Sort.Direction.DESC)
                       .named("idx_last_sync_at")
        );

        log.info("CART-V003 completed: cart_events collection and sync indexes created");
    }

    @RollbackExecution
    public void rollback(MongoTemplate mongoTemplate) {
        log.warn("Rolling back CART-V003");
        if (mongoTemplate.collectionExists(EVENTS_COLLECTION)) {
            mongoTemplate.dropCollection(EVENTS_COLLECTION);
        }
        // Remove last_sync_at index from carts
        try {
            mongoTemplate.indexOps(CARTS_COLLECTION).dropIndex("idx_last_sync_at");
        } catch (Exception e) {
            log.warn("Could not drop idx_last_sync_at index: {}", e.getMessage());
        }
        log.info("CART-V003 rollback complete");
    }
}
