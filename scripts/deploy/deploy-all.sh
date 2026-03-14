#!/bin/bash
# scripts/deploy/deploy-all.sh — Deploy all 7 Emart services
# Phases 1-5 (existing) + Phase 7 Profile + Phase 9 Notification
# Usage: sudo bash scripts/deploy/deploy-all.sh [--skip-build]
set -euo pipefail
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SKIP="${1:-}"
GRN='\033[0;32m'; BLU='\033[0;34m'; RED='\033[0;31m'; YLW='\033[0;33m'; NC='\033[0m'
ok()   { echo -e "${GRN}[ OK ]${NC}  $*"; }
info() { echo -e "${BLU}[INFO]${NC}  $*"; }
warn() { echo -e "${YLW}[WARN]${NC}  $*"; }
die()  { echo -e "${RED}[FAIL]${NC}  $*"; exit 1; }

[[ $EUID -ne 0 ]] && die "Run as root: sudo bash scripts/deploy/deploy-all.sh"

info "═══════════════════════════════════════════════════════"
info " Emart Full Stack — 7 Services + Frontend"
info "═══════════════════════════════════════════════════════"

DEPLOY="$REPO_DIR/scripts/deploy"
check_health() { curl -sf "$2" &>/dev/null && ok "$1 UP" || warn "$1 health check failed"; }

info "Step 1/8 — Login Service (Java/Spring Boot :8080)"
bash "$DEPLOY/deploy-login.sh" $SKIP

info "Step 2/8 — Cart Service (Go :8081)"
bash "$DEPLOY/deploy-cart.sh" $SKIP

info "Step 3/8 — Books Service (Node.js :8082)"
bash "$DEPLOY/deploy-books.sh" $SKIP

info "Step 4/8 — Course Service (Python :8083)"
bash "$DEPLOY/deploy-courses.sh" $SKIP

info "Step 5/8 — Payment Service (Java/Spring Boot :8084)"
bash "$DEPLOY/deploy-payment.sh" $SKIP

info "Step 6/8 — Profile Service (Node.js :8086)"
bash "$DEPLOY/deploy-profile.sh" $SKIP

info "Step 7/8 — Notification Service (Node.js :8088)"
bash "$DEPLOY/deploy-notification.sh" $SKIP

info "Step 8/8 — Frontend + Nginx"
bash "$DEPLOY/deploy-frontend.sh" $SKIP

# Health checks
echo ""
info "═══════════════════════════════════════════════════════"
info " Health Checks"
info "═══════════════════════════════════════════════════════"
sleep 3
check_health "Login Service       :8080" "http://localhost:8080/health/ready"
check_health "Cart Service        :8081" "http://localhost:8081/health/ready"
check_health "Books Service       :8082" "http://localhost:8082/health/ready"
check_health "Course Service      :8083" "http://localhost:8083/health/ready"
check_health "Payment Service     :8084" "http://localhost:8084/health/ready"
check_health "Profile Service     :8086" "http://localhost:8086/health/ready"
check_health "Notification Service:8088" "http://localhost:8088/health/ready"
check_health "Nginx               :80  " "http://localhost/nginx-health"

SERVER_IP=$(hostname -I | awk '{print $1}')
echo ""
echo "══════════════════════════════════════════════════════"
ok " Deployment complete!"
echo "══════════════════════════════════════════════════════"
echo ""
echo "  Frontend          →  http://${SERVER_IP}/"
echo "  Login API         →  http://${SERVER_IP}/api/v1/auth/login"
echo "  Cart API          →  http://${SERVER_IP}/cart-api/api/v1/cart"
echo "  Books API         →  http://${SERVER_IP}/books-api/api/v1/books"
echo "  Courses API       →  http://${SERVER_IP}/courses-api/api/v1/courses"
echo "  Payment API       →  http://${SERVER_IP}/payment-api/api/v1/checkout"
echo "  Profile API       →  http://${SERVER_IP}/profile-api/api/v1/profile"
echo "  Notification API  →  http://${SERVER_IP}/notify-api/api/v1/notify/test"
echo ""
echo "  Default admin login: admin@emart.com / Admin@123"
echo ""
