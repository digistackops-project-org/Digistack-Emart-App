// ============================================================
// rollback-all-migrations.js - DB Team EMERGENCY ROLLBACK
//
// ⚠️  WARNING: This drops the carts collection and all indexes!
//    Only run in emergencies after restoring from backup.
//
// Steps before running:
//   1. Restore from mongodump backup: mongorestore --uri=... --dir=/backup/...
//   2. OR run this script to wipe and start fresh
//
// Usage: mongosh "mongodb://user:pass@host:27017" --file rollback-all-migrations.js
// ============================================================

use('cart');

print('\n⚠️  ROLLBACK - Emart Cart Migrations');
print('This will: drop carts collection, clear mongockChangeLog, release lock\n');

// V003 rollback: remove schema validation
try {
    db.runCommand({
        collMod: 'carts',
        validator: {},
        validationLevel: 'off'
    });
    print('  ✓ V003 rolled back: schema validation removed');
} catch(e) {
    print('  ⚠ V003 rollback skipped: ' + e.message);
}

// V002 rollback: drop all custom indexes
try {
    ['idx_user_id_unique', 'idx_updated_at', 'idx_synced_at', 'idx_user_updated'].forEach(function(idx) {
        try { db.carts.dropIndex(idx); print('  ✓ Dropped index: ' + idx); }
        catch(e) { print('  ⚠ Index ' + idx + ' not found (ok)'); }
    });
} catch(e) {
    print('  ⚠ V002 rollback skipped: ' + e.message);
}

// V001 rollback: drop carts collection
try {
    db.carts.drop();
    print('  ✓ V001 rolled back: carts collection dropped');
} catch(e) {
    print('  ⚠ V001 rollback: ' + e.message);
}

// Clear change log
db.mongockChangeLog.deleteMany({});
print('  ✓ mongockChangeLog cleared');

// Release lock
db.mongockLock.updateOne(
    { _id: 'migration-lock' },
    { $set: { locked: false } }
);
print('  ✓ mongockLock released');

print('\n✅ Rollback complete. Restore from backup before re-running migrations.\n');
