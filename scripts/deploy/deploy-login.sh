#!/bin/bash
# ============================================================
# scripts/deploy/deploy-login.sh
# Builds the Login Service JAR (unless --skip-build passed)
# and restarts the systemd service.
#
# Run:  sudo bash scripts/deploy/deploy-login.sh [--skip-build]
# ============================================================
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SKIP_BUILD=${1:-""}

GRN='\033[0;32m'; YEL='\033[1;33m'; RED='\033[0;31m'; BLU='\033[0;34m'; NC='\033[0m'
ok()  { echo -e "${GRN}[ OK ]${NC}  $*"; }
info(){ echo -e "${BLU}[INFO]${NC}  $*"; }
die() { echo -e "${RED}[FAIL]${NC}  $*"; exit 1; }

[[ $EUID -ne 0 ]] && die "Run as root"

# ── Build JAR ────────────────────────────────────────────────
if [[ "$SKIP_BUILD" != "--skip-build" ]]; then
    info "Building Login Service JAR..."
    cd "$REPO_DIR/login-service"
    mvn clean package -DskipTests -q
    ok "Build succeeded"
fi

# ── Copy JAR to deployment directory ─────────────────────────
JAR=$(ls "$REPO_DIR/login-service/target/"*login*.jar 2>/dev/null | head -1)
[[ -f "$JAR" ]] || die "No JAR found in login-service/target/. Run without --skip-build."
cp "$JAR" /opt/emart/login-service/login-service.jar
chown emart:emart /opt/emart/login-service/login-service.jar
ok "JAR deployed to /opt/emart/login-service/login-service.jar"

# ── Install / update systemd unit ────────────────────────────
cat > /etc/systemd/system/emart-login.service <<'UNIT'
[Unit]
Description=Emart Login Service (Spring Boot)
After=network.target mongod.service
Wants=mongod.service

[Service]
Type=simple
User=emart
Group=emart

WorkingDirectory=/opt/emart/login-service
EnvironmentFile=/etc/emart/login.env

ExecStart=/usr/bin/java \
    -Xmx512m \
    -Dspring.profiles.active=${SPRING_PROFILE} \
    -Dspring.data.mongodb.uri=${MONGO_URI} \
    -Dapp.jwt.secret=${JWT_SECRET} \
    -Dapp.jwt.expiration-ms=${JWT_EXPIRATION_MS} \
    -Dserver.port=${SERVER_PORT} \
    -jar login-service.jar

Restart=on-failure
RestartSec=10
StartLimitBurst=3

StandardOutput=append:/var/log/emart/login-service.log
StandardError=append:/var/log/emart/login-service.log

NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
UNIT

systemctl daemon-reload
systemctl enable emart-login --quiet
systemctl restart emart-login
ok "emart-login service restarted"

# ── Wait for /health/ready ────────────────────────────────────
info "Waiting for Login Service to be ready (max 120s)..."
for i in $(seq 1 40); do
    if curl -sf http://localhost:8080/health/ready -o /dev/null; then
        ok "Login Service is UP and ready"
        exit 0
    fi
    sleep 3
done

die "Login Service did not become healthy in 120s. Check: journalctl -u emart-login -n 50"
