#!/bin/bash
# ============================================================
# scripts/deploy/deploy-all.sh
# Deploys all three services in order:
#   1. Login Service  (Java Spring Boot)
#   2. Cart Service   (Go)
#   3. Frontend       (React → Nginx static)
#   4. Nginx config   reload
#
# Options:
#   --skip-build   Use existing compiled artifacts
#
# Run:  sudo bash scripts/deploy/deploy-all.sh
# ============================================================
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SKIP_BUILD=${1:-""}

GRN='\033[0;32m'; YEL='\033[1;33m'; RED='\033[0;31m'; BLU='\033[0;34m'; NC='\033[0m'
info() { echo -e "${BLU}[INFO]${NC}  $*"; }
ok()   { echo -e "${GRN}[ OK ]${NC}  $*"; }
warn() { echo -e "${YEL}[WARN]${NC}  $*"; }
die()  { echo -e "${RED}[FAIL]${NC}  $*"; exit 1; }

[[ $EUID -ne 0 ]] && die "Run as root"

echo ""
echo "══════════════════════════════════════════════════════"
info "Emart — Full Stack Deploy  $(date)"
echo "══════════════════════════════════════════════════════"
echo ""

# ── Pre-flight checks ────────────────────────────────────────
[[ -f /etc/emart/login.env ]] || die "/etc/emart/login.env not found. Run configure-env.sh first."
[[ -f /etc/emart/cart.env  ]] || die "/etc/emart/cart.env not found.  Run configure-env.sh first."

systemctl is-active --quiet mongod        || die "MongoDB not running: sudo systemctl start mongod"
systemctl is-active --quiet redis-server  || die "Redis not running:   sudo systemctl start redis-server"
command -v nginx &>/dev/null              || die "Nginx not installed. Run install.sh first."

ok "Pre-flight checks passed"

# ── 1. Login Service ─────────────────────────────────────────
info "Step 1/4: Deploying Login Service..."
bash "$REPO_DIR/scripts/deploy/deploy-login.sh" $SKIP_BUILD
echo ""

# ── 2. Cart Service ──────────────────────────────────────────
info "Step 2/4: Deploying Cart Service..."
bash "$REPO_DIR/scripts/deploy/deploy-cart.sh" $SKIP_BUILD
echo ""

# ── 3. Frontend ──────────────────────────────────────────────
info "Step 3/4: Building and deploying Frontend..."
bash "$REPO_DIR/scripts/deploy/deploy-frontend.sh" $SKIP_BUILD
echo ""

# ── 4. Nginx ─────────────────────────────────────────────────
info "Step 4/4: Installing Nginx config and reloading..."
cp -f "$REPO_DIR/nginx/emart.conf" /etc/nginx/sites-available/emart
ln -sf /etc/nginx/sites-available/emart /etc/nginx/sites-enabled/emart
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx
ok "Nginx reloaded"

# ── Final health checks ──────────────────────────────────────
echo ""
info "Running final health checks..."
sleep 2

check_health() {
  local name=$1 url=$2
  if curl -sf -o /dev/null "$url"; then
    ok "$name health: UP"
  else
    warn "$name health: FAIL  ($url)"
  fi
}

check_health "Login Service " "http://localhost:8080/health/ready"
check_health "Cart Service  " "http://localhost:8081/health/ready"
check_health "Nginx         " "http://localhost/nginx-health"

SERVER_IP=$(hostname -I | awk '{print $1}')
echo ""
echo "══════════════════════════════════════════════════════"
ok "Deployment complete!"
echo "══════════════════════════════════════════════════════"
echo ""
echo "  Frontend   →  http://${SERVER_IP}/"
echo "  Login API  →  http://${SERVER_IP}/api/v1/auth/login"
echo "  Cart API   →  http://${SERVER_IP}/cart-api/api/v1/cart"
echo "  Health     →  http://${SERVER_IP}/nginx-health"
echo ""
