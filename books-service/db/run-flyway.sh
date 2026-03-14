#!/bin/bash
# ============================================================
# books-service/db/run-flyway.sh
# Wrapper script for running Flyway migrations.
# Used by DB team during deployment pipeline.
#
# Usage:
#   bash db/run-flyway.sh info          # Show migration status
#   bash db/run-flyway.sh migrate       # Apply pending migrations
#   bash db/run-flyway.sh validate      # Validate applied migrations
#   bash db/run-flyway.sh repair        # Repair checksums
#   bash db/run-flyway.sh clean         # !! DROP all objects (dev only)
#
# Prerequisites:
#   Flyway CLI installed: https://flywaydb.org/download
#   OR: java -jar flyway-*.jar
#
# Environment variables (or edit flyway.conf):
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

# ── Locate Flyway CLI ────────────────────────────────────────
if command -v flyway &>/dev/null; then
    FLYWAY_CMD="flyway"
elif [[ -f "$SCRIPT_DIR/../flyway/flyway" ]]; then
    FLYWAY_CMD="$SCRIPT_DIR/../flyway/flyway"
elif command -v java &>/dev/null && ls "$SCRIPT_DIR"/../flyway-*.jar 2>/dev/null | head -1; then
    FLYWAY_JAR=$(ls "$SCRIPT_DIR"/../flyway-*.jar | head -1)
    FLYWAY_CMD="java -jar $FLYWAY_JAR"
else
    die "Flyway not found. Install: https://flywaydb.org/download
  Option 1: brew install flyway
  Option 2: Download CLI and add to PATH
  Option 3: Place flyway-X.X.X.jar next to this script"
fi

info "Flyway: $FLYWAY_CMD"
info "Command: $COMMAND"
info "Config:  $SCRIPT_DIR/flyway.conf"
echo ""

# Safety guard: prevent 'clean' in production
if [[ "$COMMAND" == "clean" ]]; then
    ENV=${NODE_ENV:-${APP_ENV:-development}}
    if [[ "$ENV" == "production" || "$ENV" == "prod" ]]; then
        die "'clean' is PROHIBITED in production! Set NODE_ENV=development to use."
    fi
    warn "WARNING: 'clean' will DROP ALL objects in the database!"
    read -rp "Type 'yes-i-am-sure' to continue: " CONFIRM
    [[ "$CONFIRM" == "yes-i-am-sure" ]] || die "Aborted."
fi

# Run Flyway
$FLYWAY_CMD \
    -configFiles="$SCRIPT_DIR/flyway.conf" \
    -url="jdbc:postgresql://${DB_HOST:-localhost}:${DB_PORT:-5432}/${DB_NAME:-booksdb}" \
    -user="${DB_USER:-emart_books}" \
    -password="${DB_PASSWORD:-}" \
    -locations="filesystem:$SCRIPT_DIR/migrations" \
    "$COMMAND"

EXIT_CODE=$?
if [[ $EXIT_CODE -eq 0 ]]; then
    ok "Flyway $COMMAND completed successfully"
else
    die "Flyway $COMMAND failed with exit code $EXIT_CODE"
fi
