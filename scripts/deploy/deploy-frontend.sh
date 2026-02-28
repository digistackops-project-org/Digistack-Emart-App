#!/bin/bash
# ============================================================
# scripts/deploy/deploy-frontend.sh
# Builds the React app and deploys static files to Nginx.
#
# Run:  sudo bash scripts/deploy/deploy-frontend.sh [--skip-build]
# ============================================================
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SKIP_BUILD=${1:-""}
WEBROOT="/var/www/emart/frontend"

GRN='\033[0;32m'; YEL='\033[1;33m'; RED='\033[0;31m'; BLU='\033[0;34m'; NC='\033[0m'
ok()  { echo -e "${GRN}[ OK ]${NC}  $*"; }
info(){ echo -e "${BLU}[INFO]${NC}  $*"; }
die() { echo -e "${RED}[FAIL]${NC}  $*"; exit 1; }

[[ $EUID -ne 0 ]] && die "Run as root"

# ── Build React app ──────────────────────────────────────────
if [[ "$SKIP_BUILD" != "--skip-build" ]]; then
    info "Installing npm dependencies..."
    cd "$REPO_DIR/frontend"

    # .env.production sets the correct API base URLs for Nginx proxy
    [[ -f .env.production ]] || die ".env.production not found in frontend/"

    npm ci --prefer-offline --silent
    ok "npm ci done"

    info "Building React app..."
    CI=false npm run build
    ok "npm build done"
fi

# ── Deploy to Nginx webroot ───────────────────────────────────
BUILD_DIR="$REPO_DIR/frontend/build"
[[ -d "$BUILD_DIR" ]] || die "Build directory $BUILD_DIR not found. Run without --skip-build."

mkdir -p "$WEBROOT"
rsync -a --delete "$BUILD_DIR/" "$WEBROOT/"
chown -R www-data:www-data "$WEBROOT"
ok "Static files deployed to $WEBROOT"

[[ -f "$WEBROOT/index.html" ]] || die "index.html missing in $WEBROOT"
ok "Frontend deployed: $(ls "$WEBROOT" | wc -l) files in webroot"
