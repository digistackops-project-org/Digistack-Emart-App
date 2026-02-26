// ============================================================
// V002 - Add Cart Indexes to carts collection
// DB Team standalone script
// Usage: mongosh "mongodb://user:pass@host:27017" --file V002_AddCartIndexes.js
// ============================================================

use('cart');

print('=== V002_AddCartIndexes START ===');

// Check if already executed
var existing = db.mongockChangeLog.findOne({
    changeId: 'V002_AddCartIndexes',
    state: 'EXECUTED'
});

if (existing) {
    print('  ⏭ V002 already executed at ' + existing.executedAt + ' - skipping');
    quit(0);
}

// 1. Unique index on user_id (one cart per user)
db.carts.createIndex(
    { user_id: 1 },
    { unique: true, name: 'idx_user_id_unique', background: true }
);
print('  ✓ idx_user_id_unique created (unique)');

// 2. Index on updated_at for sync queries
db.carts.createIndex(
    { updated_at: -1 },
    { name: 'idx_updated_at', background: true }
);
print('  ✓ idx_updated_at created');

// 3. Sparse index on synced_at (find un-synced carts)
db.carts.createIndex(
    { synced_at: 1 },
    { name: 'idx_synced_at', sparse: true, background: true }
);
print('  ✓ idx_synced_at created (sparse)');

// 4. Compound index: user_id + updated_at
db.carts.createIndex(
    { user_id: 1, updated_at: -1 },
    { name: 'idx_user_updated', background: true }
);
print('  ✓ idx_user_updated compound index created');

// Verify
var indexes = db.carts.getIndexes();
print('  Total indexes on carts: ' + indexes.length);
indexes.forEach(idx => print('    - ' + idx.name));

// Record in Mongock change log
db.mongockChangeLog.updateOne(
    { changeId: 'V002_AddCartIndexes' },
    {
        $set: {
            changeId:   'V002_AddCartIndexes',
            author:     'emart-db-team',
            state:      'EXECUTED',
            executedAt: new Date(),
            order:      '002',
            source:     'manual-script'
        }
    },
    { upsert: true }
);

print('=== V002_AddCartIndexes DONE ===');
