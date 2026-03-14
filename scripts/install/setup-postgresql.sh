#!/bin/bash
# ============================================================
# scripts/install/setup-postgresql.sh
# DB team script: Create PostgreSQL booksdb + emart_books user.
# Run ONCE on first deployment by the DB team.
#
# Prerequisite: PostgreSQL 15 installed (done by install.sh)
# Run: sudo bash scripts/install/setup-postgresql.sh
# ============================================================
set -euo pipefail

GRN='\033[0;32m'; YEL='\033[1;33m'; RED='\033[0;31m'; BLU='\033[0;34m'; NC='\033[0m'
ok()   { echo -e "${GRN}[ OK ]${NC}  $*"; }
info() { echo -e "${BLU}[INFO]${NC}  $*"; }
warn() { echo -e "${YEL}[WARN]${NC}  $*"; }
die()  { echo -e "${RED}[FAIL]${NC}  $*"; exit 1; }

[[ $EUID -ne 0 ]] && die "Run as root"

# Verify PostgreSQL is running
systemctl is-active --quiet postgresql || die "PostgreSQL is not running. Run install.sh first."
ok "PostgreSQL is running"

echo ""
echo "=== Emart BooksDB Setup ==="
echo ""
read -rp "Enter password for emart_books DB user: " BOOKS_DB_PASS
echo ""

# ── Create user and database ─────────────────────────────────
info "Creating PostgreSQL user 'emart_books'..."
sudo -u postgres psql <<SQL
-- Create application user
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'emart_books') THEN
    CREATE USER emart_books WITH LOGIN PASSWORD '${BOOKS_DB_PASS}';
    RAISE NOTICE 'User emart_books created';
  ELSE
    ALTER USER emart_books WITH PASSWORD '${BOOKS_DB_PASS}';
    RAISE NOTICE 'User emart_books password updated';
  END IF;
END
\$\$;

-- Create booksdb database owned by emart_books
SELECT 'CREATE DATABASE booksdb OWNER emart_books ENCODING ''UTF8'' LC_COLLATE ''en_US.UTF-8'' LC_CTYPE ''en_US.UTF-8'' TEMPLATE template0'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'booksdb')\gexec

-- Grant privileges
GRANT CONNECT ON DATABASE booksdb TO emart_books;
SQL

ok "User 'emart_books' configured"

# ── Connect to booksdb and set up schema permissions ─────────
sudo -u postgres psql -d booksdb <<SQL
-- Grant schema privileges
GRANT USAGE  ON SCHEMA public TO emart_books;
GRANT CREATE ON SCHEMA public TO emart_books;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO emart_books;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO emart_books;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES    TO emart_books;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON SEQUENCES TO emart_books;
SQL

ok "Schema permissions set for booksdb"

# ── Create test database for integration tests ────────────────
info "Creating booksdb_test (for integration/API tests)..."
sudo -u postgres psql <<SQL
SELECT 'CREATE DATABASE booksdb_test OWNER emart_books ENCODING ''UTF8'' LC_COLLATE ''en_US.UTF-8'' LC_CTYPE ''en_US.UTF-8'' TEMPLATE template0'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'booksdb_test')\gexec

GRANT CONNECT ON DATABASE booksdb_test TO emart_books;
SQL

sudo -u postgres psql -d booksdb_test <<SQL
GRANT USAGE  ON SCHEMA public TO emart_books;
GRANT CREATE ON SCHEMA public TO emart_books;
GRANT ALL PRIVILEGES ON ALL TABLES   IN SCHEMA public TO emart_books;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO emart_books;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES    TO emart_books;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO emart_books;
SQL

ok "booksdb_test created"

# ── Verify connection ─────────────────────────────────────────
info "Verifying connection as emart_books..."
PGPASSWORD="${BOOKS_DB_PASS}" psql \
    -h localhost -U emart_books -d booksdb \
    -c "SELECT version();" >/dev/null

ok "Connection verified"

echo ""
echo "══════════════════════════════════════════════════════"
ok "PostgreSQL BooksDB setup complete!"
echo "══════════════════════════════════════════════════════"
echo ""
echo "  Database:  booksdb  (prod)"
echo "  Database:  booksdb_test  (tests)"
echo "  User:      emart_books"
echo ""
echo "Next steps:"
echo "  1. Run configure-env.sh to save DB_PASSWORD to /etc/emart/books.env"
echo "  2. DB team: run Flyway migrations: bash books-service/db/run-flyway.sh migrate"
echo "  3. Deploy team: bash scripts/deploy/deploy-books.sh"
echo ""
echo "  MONGO URIs for configure-env.sh:"
echo "    postgresql://emart_books:${BOOKS_DB_PASS}@localhost:5432/booksdb"

# ============================================================
# Phase 4 addition — coursedb setup
# ============================================================
echo ""
echo "=== Emart CourseDB Setup ==="
echo ""
read -rsp "Enter password for emart_course DB user: " COURSE_DB_PASS
echo ""

info "Creating PostgreSQL user 'emart_course' and database 'coursedb'..."
sudo -u postgres psql <<SQL2
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'emart_course') THEN
    CREATE USER emart_course WITH LOGIN PASSWORD '${COURSE_DB_PASS}';
    RAISE NOTICE 'User emart_course created';
  ELSE
    ALTER USER emart_course WITH PASSWORD '${COURSE_DB_PASS}';
    RAISE NOTICE 'User emart_course password updated';
  END IF;
END
\$\$;

SELECT 'CREATE DATABASE coursedb OWNER emart_course ENCODING ''UTF8'' LC_COLLATE ''en_US.UTF-8'' LC_CTYPE ''en_US.UTF-8'' TEMPLATE template0'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'coursedb')\gexec

GRANT CONNECT ON DATABASE coursedb TO emart_course;
SQL2

sudo -u postgres psql -d coursedb <<SQL3
GRANT USAGE  ON SCHEMA public TO emart_course;
GRANT CREATE ON SCHEMA public TO emart_course;
GRANT ALL PRIVILEGES ON ALL TABLES    IN SCHEMA public TO emart_course;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO emart_course;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES    TO emart_course;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO emart_course;
SQL3

ok "coursedb database and emart_course user ready"
ok "Run Flyway: DB_PASSWORD='${COURSE_DB_PASS}' DB_NAME=coursedb bash course-service/db/run-flyway.sh migrate"

# ============================================================
# Phase 5 addition — paymentdb setup
# ============================================================
echo ""
echo "=== Emart PaymentDB Setup ==="
echo ""
read -rsp "Enter password for emart_payment DB user: " PAYMENT_DB_PASS
echo ""

sudo -u postgres psql <<SQL4
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'emart_payment') THEN
    CREATE USER emart_payment WITH LOGIN PASSWORD '${PAYMENT_DB_PASS}';
  ELSE
    ALTER USER emart_payment WITH PASSWORD '${PAYMENT_DB_PASS}';
  END IF;
END
\$\$;
SELECT 'CREATE DATABASE paymentdb OWNER emart_payment ENCODING ''UTF8'' TEMPLATE template0'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'paymentdb')\gexec
GRANT CONNECT ON DATABASE paymentdb TO emart_payment;
SQL4

sudo -u postgres psql -d paymentdb <<SQL5
GRANT USAGE  ON SCHEMA public TO emart_payment;
GRANT CREATE ON SCHEMA public TO emart_payment;
GRANT ALL PRIVILEGES ON ALL TABLES    IN SCHEMA public TO emart_payment;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO emart_payment;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES    TO emart_payment;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO emart_payment;
SQL5
ok "paymentdb and emart_payment user ready"

# ═══════════════════════════════════════════════════════
# Phase 7 — profiledb
# ═══════════════════════════════════════════════════════
echo ""
echo "=== Emart ProfileDB Setup ==="
echo ""
read -rsp "Enter password for emart_profile DB user: " PROFILE_DB_PASS
echo ""

sudo -u postgres psql <<SQL6
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'emart_profile') THEN
    CREATE USER emart_profile WITH LOGIN PASSWORD '${PROFILE_DB_PASS}';
  ELSE
    ALTER USER emart_profile WITH PASSWORD '${PROFILE_DB_PASS}';
  END IF;
END
\$\$;
SELECT 'CREATE DATABASE profiledb OWNER emart_profile ENCODING ''UTF8'' TEMPLATE template0'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'profiledb')\gexec
GRANT CONNECT ON DATABASE profiledb TO emart_profile;
SQL6

sudo -u postgres psql -d profiledb <<SQL7
GRANT USAGE  ON SCHEMA public TO emart_profile;
GRANT CREATE ON SCHEMA public TO emart_profile;
GRANT ALL PRIVILEGES ON ALL TABLES    IN SCHEMA public TO emart_profile;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO emart_profile;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES    TO emart_profile;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO emart_profile;
SQL7
echo "profiledb and emart_profile user ready"
