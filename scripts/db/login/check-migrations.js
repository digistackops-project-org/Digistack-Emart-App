// ============================================================
// scripts/db/login/check-migrations.js
// Run: mongosh "mongodb://emart_user:PASS@localhost:27017/userdb?authSource=userdb" --file check-migrations.js
// ============================================================
const db = db.getSiblingDB('userdb');

print('\n=== Login Service (userdb) — Migration Status ===\n');

const log = db.mongockChangeLog.find({}).sort({ executedAt: 1 }).toArray();
if (log.length === 0) {
  print('No migrations recorded yet.');
} else {
  log.forEach(m => {
    const status = m.state === 'EXECUTED' ? '✓' : '✗';
    print(`${status}  ${m.changeId}  [${m.state}]  author=${m.author}  at=${m.executedAt}`);
  });
}

print('\n--- Users collection ---');
const count = db.users.countDocuments();
print(`Total users: ${count}`);

print('\n--- Indexes ---');
db.users.getIndexes().forEach(i => print(`  ${i.name}`));
print('');
