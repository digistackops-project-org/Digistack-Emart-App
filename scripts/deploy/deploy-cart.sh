#!/bin/bash
# ============================================================
# scripts/deploy/deploy-cart.sh
# Builds the Cart Service binary (unless --skip-build)
# and restarts the systemd service.
#
# Run:  sudo bash scripts/deploy/deploy-cart.sh [--skip-build]
# ============================================================
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SKIP_BUILD=${1:-""}

GRN='\033[0;32m'; YEL='\033[1;33m'; RED='\033[0;31m'; BLU='\033[0;34m'; NC='\033[0m'
ok()  { echo -e "${GRN}[ OK ]${NC}  $*"; }
info(){ echo -e "${BLU}[INFO]${NC}  $*"; }
die() { echo -e "${RED}[FAIL]${NC}  $*"; exit 1; }

[[ $EUID -ne 0 ]] && die "Run as root"

export PATH=$PATH:/usr/local/go/bin

# ── Build binary ─────────────────────────────────────────────
if [[ "$SKIP_BUILD" != "--skip-build" ]]; then
    info "Building Cart Service binary..."
    cd "$REPO_DIR/cart-service"
    go mod download
    mkdir -p bin
    CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
        go build -ldflags="-w -s" -o bin/emart-cart-service ./cmd/server/main.go
    ok "Build succeeded"
fi

# ── Copy binary to deployment directory ──────────────────────
BINARY="$REPO_DIR/cart-service/bin/emart-cart-service"
[[ -f "$BINARY" ]] || die "Binary not found at $BINARY. Run without --skip-build."
cp "$BINARY" /opt/emart/cart-service/emart-cart-service
chown emart:emart /opt/emart/cart-service/emart-cart-service
chmod +x /opt/emart/cart-service/emart-cart-service
ok "Binary deployed to /opt/emart/cart-service/emart-cart-service"

# ── Install / update systemd unit ────────────────────────────
cat > /etc/systemd/system/emart-cart.service <<'UNIT'
[Unit]
Description=Emart Cart Service (Go)
After=network.target mongod.service redis.service
Wants=mongod.service redis.service

[Service]
Type=simple
User=emart
Group=emart

WorkingDirectory=/opt/emart/cart-service
EnvironmentFile=/etc/emart/cart.env

ExecStart=/opt/emart/cart-service/emart-cart-service

Restart=on-failure
RestartSec=10
StartLimitBurst=3

StandardOutput=append:/var/log/emart/cart-service.log
StandardError=append:/var/log/emart/cart-service.log

NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
UNIT

systemctl daemon-reload
systemctl enable emart-cart --quiet
systemctl restart emart-cart
ok "emart-cart service restarted"

# ── Wait for /health/ready ────────────────────────────────────
info "Waiting for Cart Service to be ready (max 90s)..."
for i in $(seq 1 30); do
    if curl -sf http://localhost:8081/health/ready -o /dev/null; then
        ok "Cart Service is UP and ready"
        exit 0
    fi
    sleep 3
done

die "Cart Service did not become healthy in 90s. Check: journalctl -u emart-cart -n 50"
