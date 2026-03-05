#!/bin/bash
# ============================================================
# course-service/db/run-flyway.sh
# Flyway wrapper for coursedb PostgreSQL migrations.
# DB Team runs this at every deployment stage.
#
# Usage:
#   bash db/run-flyway.sh info          # Show migration status
#   bash db/run-flyway.sh migrate       # Apply pending migrations
#   bash db/run-flyway.sh validate      # Verify checksums
#   bash db/run-flyway.sh repair        # Fix failed state
#   bash db/run-flyway.sh clean         # DROP all (DEV only!)
#
# Env vars (or set in flyway.conf):
#   DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
# ============================================================
set -euo pipefail

RED='\033[0;31m'; GRN='\033[0;32m'; YEL='\033[1;33m'; BLU='\033[0;34m'; NC='\033[0m'
ok()   { echo -e "${GRN}[ OK ]${NC}  $*"; }
info() { echo -e "${BLU}[INFO]${NC}  $*"; }
warn() { echo -e "${YEL}[WARN]${NC}  $*"; }
die()  { echo -e "${RED}[FAIL]${NC}  $*"; exit 1; }

COMMAND=${1:-info}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ── Locate Flyway CLI ─────────────────────────────────────────
if command -v flyway &>/dev/null; then
    FLYWAY_CMD="flyway"
elif command -v java &>/dev/null && ls "$SCRIPT_DIR"/../flyway-*.jar 2>/dev/null | head -1; then
    FLYWAY_JAR=$(ls "$SCRIPT_DIR"/../flyway-*.jar | head -1)
    FLYWAY_CMD="java -jar $FLYWAY_JAR"
else
    die "Flyway not found.
  Install option 1: brew install flyway
  Install option 2: Download from https://flywaydb.org/download and add to PATH
  Install option 3: Place flyway-X.X.jar in course-service/ directory"
fi

info "Flyway: $FLYWAY_CMD | Command: $COMMAND | DB: ${DB_NAME:-coursedb}"
echo ""

# Safety: block 'clean' in production
if [[ "$COMMAND" == "clean" ]]; then
    ENV="${APP_ENV:-${NODE_ENV:-development}}"
    if [[ "$ENV" == "production" || "$ENV" == "prod" ]]; then
        die "'clean' is PROHIBITED in production! APP_ENV must not be production."
    fi
    warn "WARNING: 'clean' will DROP ALL objects in coursedb!"
    read -rp "Type 'yes-drop-everything' to continue: " CONFIRM
    [[ "$CONFIRM" == "yes-drop-everything" ]] || die "Aborted."
fi

# ── Run Flyway ────────────────────────────────────────────────
$FLYWAY_CMD \
    -configFiles="$SCRIPT_DIR/flyway.conf" \
    -url="jdbc:postgresql://${DB_HOST:-localhost}:${DB_PORT:-5432}/${DB_NAME:-coursedb}" \
    -user="${DB_USER:-emart_course}" \
    -password="${DB_PASSWORD:-}" \
    -locations="filesystem:$SCRIPT_DIR/migrations" \
    "$COMMAND"

EXIT_CODE=$?
if [[ $EXIT_CODE -eq 0 ]]; then
    ok "Flyway $COMMAND completed successfully"
    if [[ "$COMMAND" == "migrate" ]]; then
        info "Verify with:  psql -U ${DB_USER:-emart_course} -d ${DB_NAME:-coursedb} -c 'SELECT * FROM flyway_schema_history;'"
    fi
else
    die "Flyway $COMMAND failed with exit code $EXIT_CODE"
fi
