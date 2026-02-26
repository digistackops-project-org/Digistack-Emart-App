// ============================================================
// Emart Cart DB - Standalone Migration Scripts
// DB Team: Run these directly with mongosh if needed outside
// the Go Mongock runner (e.g. CI/CD pre-check or emergency)
//
// Usage:
//   mongosh "mongodb://user:pass@host:27017" --file V001_CreateCartsCollection.js
//
// IMPORTANT: The Go cart service runs these automatically on
// startup via the Mongock-style migration runner. Only run
// these manually if directed by DB lead.
// ============================================================

// ============================================================
// V001 - Create carts collection
// ============================================================
use('cart');

print('=== V001_CreateCartsCollection START ===');

var collections = db.getCollectionNames();
if (!collections.includes('carts')) {
    db.createCollection('carts');
    print('  ✓ carts collection created');
} else {
    print('  ⏭ carts collection already exists - skipping');
}

// Record in Mongock change log (mirrors what Go runner does)
db.mongockChangeLog.updateOne(
    { changeId: 'V001_CreateCartsCollection' },
    {
        $set: {
            changeId:   'V001_CreateCartsCollection',
            author:     'emart-db-team',
            state:      'EXECUTED',
            executedAt: new Date(),
            order:      '001',
            source:     'manual-script'
        }
    },
    { upsert: true }
);

print('=== V001_CreateCartsCollection DONE ===');
