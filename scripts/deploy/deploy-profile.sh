#!/bin/bash
# scripts/deploy/deploy-profile.sh — Phase 7 Profile Service (Node.js :8086)
set -euo pipefail
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SKIP_BUILD=${1:-""}
GRN='\033[0;32m'; BLU='\033[0;34m'; RED='\033[0;31m'; NC='\033[0m'
ok()  { echo -e "${GRN}[ OK ]${NC}  $*"; }
info(){ echo -e "${BLU}[INFO]${NC}  $*"; }
die() { echo -e "${RED}[FAIL]${NC}  $*"; exit 1; }

[[ $EUID -ne 0 ]] && die "Run as root: sudo bash scripts/deploy/deploy-profile.sh"
[[ -f /etc/emart/profile.env ]] || die "/etc/emart/profile.env not found"
command -v node &>/dev/null || die "Node.js not installed"

info "=== Deploying Profile Service (Node.js :8086) ==="
install -d -o emart -g emart /opt/emart/profile-service /var/log/emart

if [[ "$SKIP_BUILD" != "--skip-build" ]]; then
    info "Installing npm dependencies..."
    cd "$REPO_DIR/profile-service"
    npm ci --omit=dev --quiet
    rsync -a --delete "$REPO_DIR/profile-service/" /opt/emart/profile-service/
    ok "Files synced to /opt/emart/profile-service/"
    cd "$REPO_DIR"
fi
chown -R emart:emart /opt/emart/profile-service

cat > /etc/systemd/system/emart-profile.service <<SERVICE
[Unit]
Description=Emart Profile Service (Node.js)
After=network.target postgresql.service
Wants=postgresql.service

[Service]
Type=simple
User=emart
Group=emart
WorkingDirectory=/opt/emart/profile-service
EnvironmentFile=/etc/emart/profile.env
ExecStart=/usr/bin/node src/server.js
Restart=on-failure
RestartSec=5
StandardOutput=append:/var/log/emart/profile-service.log
StandardError=append:/var/log/emart/profile-service.log
NoNewPrivileges=true

[Install]
WantedBy=multi-user.target
SERVICE

systemctl daemon-reload
systemctl enable emart-profile
systemctl restart emart-profile
ok "emart-profile service started"

info "Waiting for Profile Service..."
for i in $(seq 1 20); do
    curl -sf "http://localhost:${PORT:-8086}/health/ready" &>/dev/null && ok "Profile Service healthy" && break
    [[ $i -eq 20 ]] && die "Not ready in 40s. journalctl -u emart-profile -n 50"
    echo -n "."; sleep 2
done
echo ""
ok "=== Profile Service deployed ==="
