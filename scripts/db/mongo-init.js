// ============================================================
// MongoDB Initialization Script
// Runs on first startup: docker-entrypoint-initdb.d/
// ============================================================

// Switch to userdb
db = db.getSiblingDB('userdb');

// Create application user with limited permissions
db.createUser({
  user: 'emart_app',
  pwd: 'emart_app_pass_2024',  // Change in production
  roles: [
    { role: 'readWrite', db: 'userdb' }
  ]
});

// Create users collection (Mongock will add indexes and validation)
db.createCollection('users');

print('MongoDB userdb initialization complete.');
print('Application user created: emart_app');
