package com.emart.login.migration;

import com.mongodb.client.MongoDatabase;
import com.mongodb.client.model.ValidationAction;
import com.mongodb.client.model.ValidationLevel;
import io.mongock.api.annotations.ChangeUnit;
import io.mongock.api.annotations.Execution;
import io.mongock.api.annotations.RollbackExecution;
import lombok.extern.slf4j.Slf4j;
import org.bson.Document;
import org.springframework.data.mongodb.core.MongoTemplate;

import java.util.Arrays;
import java.util.List;

/**
 * Mongock Migration: V002 - Add MongoDB schema validation to users collection
 * Enforces data integrity at the database level.
 */
@ChangeUnit(id = "V002_AddSchemaValidation", order = "002", author = "emart-db-team")
@Slf4j
public class V002_AddSchemaValidation {

    @Execution
    public void execute(MongoTemplate mongoTemplate) {
        log.info("Executing migration V002: Adding schema validation to users collection");

        MongoDatabase db = mongoTemplate.getDb();

        // JSON Schema validator for users collection
        Document jsonSchema = new Document("$jsonSchema", new Document()
            .append("bsonType", "object")
            .append("required", Arrays.asList("name", "email", "phone", "password", "city"))
            .append("properties", new Document()
                .append("name", new Document()
                    .append("bsonType", "string")
                    .append("minLength", 2)
                    .append("maxLength", 100)
                    .append("description", "User full name - required string"))
                .append("email", new Document()
                    .append("bsonType", "string")
                    .append("pattern", "^[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}$")
                    .append("description", "User email - required valid email format"))
                .append("phone", new Document()
                    .append("bsonType", "string")
                    .append("pattern", "^[+]?[0-9]{10,15}$")
                    .append("description", "User phone - required valid phone format"))
                .append("password", new Document()
                    .append("bsonType", "string")
                    .append("minLength", 60) // BCrypt hash length
                    .append("description", "Hashed password"))
                .append("city", new Document()
                    .append("bsonType", "string")
                    .append("minLength", 2)
                    .append("maxLength", 100))
                .append("enabled", new Document()
                    .append("bsonType", "bool"))
                .append("locked", new Document()
                    .append("bsonType", "bool"))
                .append("schema_version", new Document()
                    .append("bsonType", "int")
                    .append("minimum", 1))
            )
        );

        Document collModCmd = new Document("collMod", "users")
            .append("validator", jsonSchema)
            .append("validationLevel", "moderate")  // moderate = validate inserts + updates to valid docs
            .append("validationAction", "error");

        db.runCommand(collModCmd);
        log.info("V002 migration completed: Schema validation applied to users collection");
    }

    @RollbackExecution
    public void rollback(MongoTemplate mongoTemplate) {
        log.warn("Rolling back V002: Removing schema validation from users collection");
        MongoDatabase db = mongoTemplate.getDb();
        // Remove validation by setting empty validator
        db.runCommand(new Document("collMod", "users")
            .append("validator", new Document())
            .append("validationLevel", "off"));
        log.info("Schema validation removed from users collection");
    }
}
