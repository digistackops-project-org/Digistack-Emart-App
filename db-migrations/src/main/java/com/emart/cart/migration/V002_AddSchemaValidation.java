package com.emart.cart.migration;

import com.mongodb.client.MongoDatabase;
import io.mongock.api.annotations.ChangeUnit;
import io.mongock.api.annotations.Execution;
import io.mongock.api.annotations.RollbackExecution;
import lombok.extern.slf4j.Slf4j;
import org.bson.Document;
import org.springframework.data.mongodb.core.MongoTemplate;

import java.util.Arrays;

/**
 * Mongock Migration: CART-V002 - Add JSON Schema validation to carts collection
 *
 * Enforces:
 *   - Required fields: user_id, user_email, status, currency
 *   - status must be: active | checked_out | abandoned
 *   - currency must be: INR | USD | EUR
 *   - items is array
 *   - schema_version is positive integer
 */
@ChangeUnit(id = "CART-V002_AddSchemaValidation", order = "002", author = "emart-db-team")
@Slf4j
public class V002_AddSchemaValidation {

    @Execution
    public void execute(MongoTemplate mongoTemplate) {
        log.info("Executing CART-V002: Adding schema validation to carts collection");

        MongoDatabase db = mongoTemplate.getDb();

        Document jsonSchema = new Document("$jsonSchema", new Document()
            .append("bsonType", "object")
            .append("required", Arrays.asList("user_id", "user_email", "status", "currency", "items"))
            .append("properties", new Document()
                .append("user_id", new Document()
                    .append("bsonType", "string")
                    .append("minLength", 1)
                    .append("description", "MongoDB user ID from login service - required"))
                .append("user_email", new Document()
                    .append("bsonType", "string")
                    .append("pattern", "^[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}$")
                    .append("description", "User email - required valid format"))
                .append("status", new Document()
                    .append("enum", Arrays.asList("active", "checked_out", "abandoned"))
                    .append("description", "Cart status - must be active, checked_out, or abandoned"))
                .append("currency", new Document()
                    .append("enum", Arrays.asList("INR", "USD", "EUR"))
                    .append("description", "Currency code"))
                .append("items", new Document()
                    .append("bsonType", "array")
                    .append("description", "Cart items array"))
                .append("total_items", new Document()
                    .append("bsonType", "int")
                    .append("minimum", 0))
                .append("total_amount", new Document()
                    .append("bsonType", "double")
                    .append("minimum", 0))
                .append("schema_version", new Document()
                    .append("bsonType", "int")
                    .append("minimum", 1))
            )
        );

        Document collMod = new Document("collMod", "carts")
            .append("validator", jsonSchema)
            .append("validationLevel", "moderate")
            .append("validationAction", "error");

        db.runCommand(collMod);
        log.info("CART-V002 completed: Schema validation applied to carts collection");
    }

    @RollbackExecution
    public void rollback(MongoTemplate mongoTemplate) {
        log.warn("Rolling back CART-V002: Removing schema validation from carts");
        mongoTemplate.getDb().runCommand(
            new Document("collMod", "carts")
                .append("validator", new Document())
                .append("validationLevel", "off")
        );
        log.info("Schema validation removed from carts collection");
    }
}
