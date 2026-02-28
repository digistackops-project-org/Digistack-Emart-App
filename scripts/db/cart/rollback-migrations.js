// ============================================================
// scripts/db/cart/rollback-migrations.js
// EMERGENCY: drops carts collection and clears migration log.
// Run: mongosh "mongodb://emart_user:PASS@localhost:27017/cart?authSource=cart" \
//       --file rollback-migrations.js
// ============================================================
const db = db.getSiblingDB('cart');

print('WARNING: This will DROP the carts collection and clear migration history!');
print('Dropping carts collection...');
db.carts.drop();

print('Clearing mongockChangeLog...');
db.mongockChangeLog.deleteMany({});

print('Releasing migration lock...');
db.mongockLock.updateOne(
  { _id: 'migration-lock' },
  { $set: { locked: false } }
);

print('Done. Migrations will re-run on next cart-service startup.');
