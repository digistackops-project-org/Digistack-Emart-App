#!/bin/bash
# ============================================================
# scripts/deploy/deploy-all.sh
# Deploys ALL Emart services in dependency order (5 microservices):
#   1. Login Service   (Java Spring Boot  :8080)
#   2. Cart Service    (Go                :8081)
#   3. Books Service   (Node.js           :8082)
#   4. Course Service  (Python/FastAPI    :8083)
#   5. Payment Service (Java Spring Boot  :8084)
#   5. Frontend        (React → Nginx static)
#   6. Nginx config    reload
#
# Options:
#   --skip-build   Restart services without re-compiling/installing
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
[[ -f /etc/emart/books.env ]] || die "/etc/emart/books.env not found. Run configure-env.sh first."
[[ -f /etc/emart/course.env ]] || die "/etc/emart/course.env not found. Run configure-env.sh first."

systemctl is-active --quiet mongod        || die "MongoDB not running:    sudo systemctl start mongod"
systemctl is-active --quiet redis-server  || die "Redis not running:     sudo systemctl start redis-server"
systemctl is-active --quiet postgresql    || die "PostgreSQL not running: sudo systemctl start postgresql"
command -v nginx &>/dev/null              || die "Nginx not installed. Run install.sh first."

ok "Pre-flight checks passed"

# ── 1. Login Service ─────────────────────────────────────────
info "Step 1/5: Deploying Login Service..."
bash "$REPO_DIR/scripts/deploy/deploy-login.sh" $SKIP_BUILD
echo ""

# ── 2. Cart Service ──────────────────────────────────────────
info "Step 2/5: Deploying Cart Service..."
bash "$REPO_DIR/scripts/deploy/deploy-cart.sh" $SKIP_BUILD
echo ""

# ── 3. Frontend ──────────────────────────────────────────────
info "Step 3/5: Deploying Books Service..."
bash "$REPO_DIR/scripts/deploy/deploy-books.sh" $SKIP_BUILD
echo ""

info "Step 4/6: Deploying Course Service (Python/FastAPI :8083)..."
bash "$REPO_DIR/scripts/deploy/deploy-courses.sh" $SKIP_BUILD
echo ""

info "Step 5/6: Deploying Payment Service (Java Spring Boot :8084)..."
bash "$REPO_DIR/scripts/deploy/deploy-payment.sh" $SKIP_BUILD
echo ""

info "Step 6/6: Building and deploying Frontend..."
bash "$REPO_DIR/scripts/deploy/deploy-frontend.sh" $SKIP_BUILD
echo ""

# ── 5. Nginx ─────────────────────────────────────────────────
info "Step 5/5: Installing Nginx config and reloading..."
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
check_health "Books Service " "http://localhost:8082/health/ready"
check_health "Course Service" "http://localhost:8083/health/ready"
check_health "Payment Service" "http://localhost:8084/health/ready"
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
echo "  Books API  →  http://${SERVER_IP}/books-api/api/v1/books"
echo "  Courses API→  http://${SERVER_IP}/courses-api/api/v1/courses"
echo "  Payment API→  http://${SERVER_IP}/payment-api/api/v1/checkout"
echo "  Health     →  http://${SERVER_IP}/nginx-health"
echo ""
