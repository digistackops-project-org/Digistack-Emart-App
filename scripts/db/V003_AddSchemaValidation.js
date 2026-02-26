// ============================================================
// V003 - Add JSON Schema Validation to carts collection
// DB Team standalone script
// Usage: mongosh "mongodb://user:pass@host:27017" --file V003_AddSchemaValidation.js
// ============================================================

use('cart');

print('=== V003_AddSchemaValidation START ===');

// Check if already executed
var existing = db.mongockChangeLog.findOne({
    changeId: 'V003_AddSchemaValidation',
    state: 'EXECUTED'
});

if (existing) {
    print('  ⏭ V003 already executed at ' + existing.executedAt + ' - skipping');
    quit(0);
}

// Apply JSON Schema validation to the carts collection
db.runCommand({
    collMod: 'carts',
    validator: {
        $jsonSchema: {
            bsonType: 'object',
            required: ['user_id', 'items', 'total_items', 'total_price'],
            properties: {
                user_id: {
                    bsonType: 'string',
                    description: 'Required. User ID from Login service JWT. Must be a string.'
                },
                items: {
                    bsonType: 'array',
                    description: 'Required. Array of cart items.',
                    items: {
                        bsonType: 'object',
                        required: ['item_id', 'product_id', 'product_name', 'category', 'price', 'quantity'],
                        properties: {
                            item_id:      { bsonType: 'string' },
                            product_id:   { bsonType: 'string' },
                            product_name: { bsonType: 'string' },
                            category: {
                                bsonType: 'string',
                                // Only these 3 categories are valid - matches cart service handler
                                enum: ['books', 'courses', 'software'],
                                description: 'Must be one of: books, courses, software'
                            },
                            price: {
                                bsonType: 'double',
                                minimum: 0,
                                description: 'Price must be >= 0'
                            },
                            quantity: {
                                bsonType: 'int',
                                minimum: 1,
                                maximum: 100
                            }
                        }
                    }
                },
                total_items: {
                    bsonType: 'int',
                    minimum: 0
                },
                total_price: {
                    bsonType: 'double',
                    minimum: 0
                },
                schema_version: {
                    bsonType: 'int',
                    minimum: 1
                }
            }
        }
    },
    validationLevel:  'moderate', // applies to inserts & updates; existing docs unaffected
    validationAction: 'error'     // reject invalid documents
});

print('  ✓ JSON Schema validation applied to carts collection');
print('  ✓ Valid categories: books, courses, software');
print('  ✓ Required fields: user_id, items, total_items, total_price');
print('  ✓ validationLevel: moderate | validationAction: error');

// Record in Mongock change log
db.mongockChangeLog.updateOne(
    { changeId: 'V003_AddSchemaValidation' },
    {
        $set: {
            changeId:   'V003_AddSchemaValidation',
            author:     'emart-db-team',
            state:      'EXECUTED',
            executedAt: new Date(),
            order:      '003',
            source:     'manual-script'
        }
    },
    { upsert: true }
);

print('=== V003_AddSchemaValidation DONE ===');
