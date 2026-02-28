// ============================================================
// scripts/db/cart/check-migrations.js
// Run: mongosh "mongodb://emart_user:PASS@localhost:27017/cart?authSource=cart" --file check-migrations.js
// ============================================================
const db = db.getSiblingDB('cart');

print('\n=== Cart Service (cart) — Migration Status ===\n');

const log = db.mongockChangeLog.find({}).sort({ executedAt: 1 }).toArray();
if (log.length === 0) {
  print('No migrations recorded yet.');
} else {
  log.forEach(m => {
    const status = m.state === 'EXECUTED' ? '✓' : '✗';
    print(`${status}  ${m.changeId}  [${m.state}]  author=${m.author}  at=${m.executedAt}`);
  });
}

print('\n--- Lock status ---');
const lock = db.mongockLock.findOne({ _id: 'migration-lock' });
print(lock ? `Lock held: ${lock.locked}` : 'No lock document');

print('\n--- Carts collection ---');
const count = db.carts.countDocuments();
print(`Total carts: ${count}`);

print('\n--- Indexes ---');
db.carts.getIndexes().forEach(i => print(`  ${i.name}`));
print('');
