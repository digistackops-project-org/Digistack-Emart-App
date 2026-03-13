#!/bin/bash
# scripts/deploy/deploy-notification.sh — Phase 9 Notification Service (Node.js :8088)
set -euo pipefail
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SKIP_BUILD=${1:-""}
GRN='\033[0;32m'; BLU='\033[0;34m'; RED='\033[0;31m'; NC='\033[0m'
ok()  { echo -e "${GRN}[ OK ]${NC}  $*"; }
info(){ echo -e "${BLU}[INFO]${NC}  $*"; }
die() { echo -e "${RED}[FAIL]${NC}  $*"; exit 1; }

[[ $EUID -ne 0 ]] && die "Run as root: sudo bash scripts/deploy/deploy-notification.sh"
[[ -f /etc/emart/notification.env ]] || die "/etc/emart/notification.env not found. Run configure-env.sh first."
command -v node &>/dev/null || die "Node.js not installed"

info "=== Deploying Notification Service (Node.js :8088) ==="
install -d -o emart -g emart /opt/emart/notification-service /var/log/emart

if [[ "$SKIP_BUILD" != "--skip-build" ]]; then
    info "Installing npm dependencies..."
    cd "$REPO_DIR/notification-service"
    npm ci --omit=dev --quiet
    rsync -a --delete "$REPO_DIR/notification-service/" /opt/emart/notification-service/
    ok "Files synced to /opt/emart/notification-service/"
    cd "$REPO_DIR"
fi
chown -R emart:emart /opt/emart/notification-service

cat > /etc/systemd/system/emart-notification.service <<SERVICE
[Unit]
Description=Emart Notification Service (Node.js)
After=network.target

[Service]
Type=simple
User=emart
Group=emart
WorkingDirectory=/opt/emart/notification-service
EnvironmentFile=/etc/emart/notification.env
ExecStart=/usr/bin/node src/server.js
Restart=on-failure
RestartSec=5
StandardOutput=append:/var/log/emart/notification-service.log
StandardError=append:/var/log/emart/notification-service.log
NoNewPrivileges=true

[Install]
WantedBy=multi-user.target
SERVICE

systemctl daemon-reload
systemctl enable emart-notification
systemctl restart emart-notification
ok "emart-notification service started"

info "Waiting for Notification Service..."
for i in $(seq 1 15); do
    curl -sf "http://localhost:${PORT:-8088}/health/ready" &>/dev/null && ok "Notification Service healthy" && break
    [[ $i -eq 15 ]] && die "Not ready in 30s. journalctl -u emart-notification -n 50"
    echo -n "."; sleep 2
done
echo ""
ok "=== Notification Service deployed ==="
