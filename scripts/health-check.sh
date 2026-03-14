#!/bin/bash
# ============================================================
# scripts/health-check.sh
# Checks all 7 Emart services are running and healthy.
# Run:  bash scripts/health-check.sh
# ============================================================
GRN='\033[0;32m'; RED='\033[0;31m'; YEL='\033[1;33m'; NC='\033[0m'
ok()   { echo -e "${GRN}[ UP ]${NC}  $*"; }
fail() { echo -e "${RED}[DOWN]${NC}  $*"; }
warn() { echo -e "${YEL}[WARN]${NC}  $*"; }

declare -A SERVICES=(
  ["Login Service"]="8080"
  ["Cart Service"]="8081"
  ["Books Service"]="8082"
  ["Course Service"]="8083"
  ["Payment Service"]="8084"
  ["Profile Service"]="8086"
  ["Notification Service"]="8088"
)

declare -A UNITS=(
  ["Login Service"]="emart-login"
  ["Cart Service"]="emart-cart"
  ["Books Service"]="emart-books"
  ["Course Service"]="emart-courses"
  ["Payment Service"]="emart-payment"
  ["Profile Service"]="emart-profile"
  ["Notification Service"]="emart-notification"
)

echo ""
echo "═══════════════════════════════════════════════"
echo "  Emart Service Health Check"
echo "═══════════════════════════════════════════════"

ALL_UP=true
for name in "Login Service" "Cart Service" "Books Service" "Course Service" \
            "Payment Service" "Profile Service" "Notification Service"; do
  port="${SERVICES[$name]}"
  unit="${UNITS[$name]}"

  # Check systemd
  if ! systemctl is-active --quiet "$unit" 2>/dev/null; then
    fail "$name  (:$port)  systemd unit $unit is NOT running"
    ALL_UP=false
    continue
  fi

  # Check HTTP health endpoint
  HTTP=$(curl -sf -o /dev/null -w "%{http_code}" \
    "http://localhost:$port/health/ready" 2>/dev/null || echo "000")
  if [[ "$HTTP" == "200" ]]; then
    ok "$name  (:$port)"
  else
    fail "$name  (:$port)  /health/ready returned HTTP $HTTP"
    ALL_UP=false
  fi
done

echo ""
echo "─── Nginx ───────────────────────────────────"
if systemctl is-active --quiet nginx; then
  HTTP=$(curl -sf -o /dev/null -w "%{http_code}" http://localhost/nginx-health 2>/dev/null || echo "000")
  if [[ "$HTTP" == "200" ]]; then
    ok "Nginx  (:80)  reverse proxy active"
  else
    warn "Nginx running but /nginx-health returned HTTP $HTTP"
  fi
else
  fail "Nginx is NOT running"
  ALL_UP=false
fi

echo ""
echo "─── Databases ───────────────────────────────"
# MongoDB
if systemctl is-active --quiet mongod; then
  ok "MongoDB  (:27017)"
else
  fail "MongoDB is NOT running"
  ALL_UP=false
fi

# Redis
if redis-cli ping 2>/dev/null | grep -q PONG; then
  ok "Redis  (:6379)"
else
  fail "Redis is NOT running or not responding"
  ALL_UP=false
fi

# PostgreSQL
if systemctl is-active --quiet postgresql; then
  ok "PostgreSQL  (:5432)"
else
  fail "PostgreSQL is NOT running"
  ALL_UP=false
fi

echo ""
echo "═══════════════════════════════════════════════"
if $ALL_UP; then
  echo -e "${GRN}  All services are UP and healthy!${NC}"
else
  echo -e "${RED}  Some services are DOWN — check logs above${NC}"
  echo "  Tip: sudo journalctl -u <unit-name> -n 50"
fi
echo "═══════════════════════════════════════════════"
echo ""

$ALL_UP
