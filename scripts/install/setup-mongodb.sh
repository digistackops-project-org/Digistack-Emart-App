#!/bin/bash
# ============================================================
# scripts/install/setup-mongodb.sh
# Creates MongoDB users and databases for both services.
# Run ONCE after install.sh.
#
# Run:  sudo bash scripts/install/setup-mongodb.sh
# ============================================================
set -euo pipefail

GRN='\033[0;32m'; YEL='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
ok()   { echo -e "${GRN}[ OK ]${NC}  $*"; }
warn() { echo -e "${YEL}[WARN]${NC}  $*"; }
die()  { echo -e "${RED}[FAIL]${NC}  $*"; exit 1; }

[[ $EUID -ne 0 ]] && die "Run as root"
command -v mongosh &>/dev/null || die "mongosh not found. Install MongoDB first."

# Generate secure random passwords
ADMIN_PASS=$(openssl rand -base64 18 | tr -d '=+/')
APP_PASS=$(openssl rand -base64 18 | tr -d '=+/')

echo "=== MongoDB Setup ==="
echo "Admin password : $ADMIN_PASS"
echo "App user pass  : $APP_PASS"
echo ""
read -rp "Confirm to proceed (Ctrl+C to cancel): " _

# ── Start Mongo without auth to create initial users ────────
systemctl stop mongod || true; sleep 2
mongod --port 27017 --dbpath /var/lib/mongodb \
    --fork --logpath /tmp/mongod-setup.log --noauth
sleep 3

# ── Create admin user ────────────────────────────────────────
mongosh --quiet <<MONGO
use admin
db.createUser({
  user: "admin",
  pwd:  "${ADMIN_PASS}",
  roles: [
    { role: "userAdminAnyDatabase", db: "admin" },
    { role: "readWriteAnyDatabase", db: "admin" },
    { role: "dbAdminAnyDatabase",   db: "admin" }
  ]
})
print("admin user created")
MONGO

# ── Create emart_user for both databases ─────────────────────
mongosh --quiet -u admin -p "${ADMIN_PASS}" --authenticationDatabase admin <<MONGO
use userdb
db.createUser({ user: "emart_user", pwd: "${APP_PASS}", roles: [{ role: "readWrite", db: "userdb" }] })
print("emart_user created for userdb")

use cart
db.createUser({ user: "emart_user", pwd: "${APP_PASS}", roles: [{ role: "readWrite", db: "cart" }] })
print("emart_user created for cart")
MONGO

# ── Re-enable auth in config, restart service ────────────────
mongod --shutdown --dbpath /var/lib/mongodb 2>/dev/null || true
sleep 2

# Ensure authorization is enabled in mongod.conf
grep -q "authorization:" /etc/mongod.conf || \
    echo -e "\nsecurity:\n  authorization: enabled" >> /etc/mongod.conf

systemctl start mongod; sleep 3

# ── Verify connections ────────────────────────────────────────
mongosh "mongodb://emart_user:${APP_PASS}@localhost:27017/userdb?authSource=userdb" \
    --eval "db.runCommand({ping:1})" --quiet && ok "userdb connection OK"
mongosh "mongodb://emart_user:${APP_PASS}@localhost:27017/cart?authSource=cart" \
    --eval "db.runCommand({ping:1})" --quiet && ok "cart db connection OK"

# ── Print connection strings ─────────────────────────────────
echo ""
echo "══════════════════════════════════════════════════════"
ok "MongoDB setup complete!"
echo "══════════════════════════════════════════════════════"
echo ""
echo "Save these — you need them in the next step:"
echo ""
echo "  MongoDB Admin:    admin / ${ADMIN_PASS}"
echo "  Login MONGO_URI:  mongodb://emart_user:${APP_PASS}@localhost:27017/userdb?authSource=userdb"
echo "  Cart  MONGO_URI:  mongodb://emart_user:${APP_PASS}@localhost:27017"
echo ""
echo "Next step:"
echo "  sudo bash scripts/install/configure-env.sh"
