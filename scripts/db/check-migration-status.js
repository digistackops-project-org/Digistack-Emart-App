// ============================================================
// check-migration-status.js - DB Team utility script
// Prints current migration state from mongockChangeLog
//
// Usage: mongosh "mongodb://user:pass@host:27017" --file check-migration-status.js
// ============================================================

use('cart');

print('\n╔══════════════════════════════════════════════════════╗');
print('║         EMART CART - Migration Status Report         ║');
print('╚══════════════════════════════════════════════════════╝\n');

// All expected migrations (in order)
var expected = [
    { id: 'V001_CreateCartsCollection', order: '001' },
    { id: 'V002_AddCartIndexes',        order: '002' },
    { id: 'V003_AddSchemaValidation',   order: '003' },
];

expected.forEach(function(m) {
    var record = db.mongockChangeLog.findOne({ changeId: m.id });
    if (record && record.state === 'EXECUTED') {
        print('  ✅ [EXECUTED] ' + m.id + ' (at: ' + record.executedAt + ')');
    } else if (record && record.state === 'FAILED') {
        print('  ❌ [FAILED]   ' + m.id + ' - ERROR: ' + record.error);
    } else {
        print('  ⏳ [PENDING]  ' + m.id + ' (not yet executed)');
    }
});

print('\n--- Collections ---');
db.getCollectionNames().forEach(c => print('  📁 ' + c));

print('\n--- carts Indexes ---');
try {
    db.carts.getIndexes().forEach(idx => print('  🔑 ' + idx.name + (idx.unique ? ' [UNIQUE]' : '')));
} catch(e) {
    print('  (carts collection not found yet)');
}

print('\n--- Active Carts in DB ---');
print('  Total carts: ' + db.carts.countDocuments({}));

print('\n--- Migration Lock ---');
var lock = db.mongockLock.findOne({ _id: 'migration-lock' });
if (lock) {
    print('  Lock status: ' + (lock.locked ? '🔒 LOCKED' : '🔓 FREE'));
    if (lock.locked) {
        print('  Locked at: ' + lock.lockedAt);
        print('  Expires at: ' + lock.expiresAt);
        print('\n  ⚠️  If lock is stuck, run:');
        print('  db.mongockLock.updateOne({_id:"migration-lock"},{$set:{locked:false}})');
    }
} else {
    print('  No lock record found (migration never run)');
}
print('');
