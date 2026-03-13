#!/bin/bash
# ============================================================
# scripts/deploy/deploy-payment.sh
# Builds and deploys the Payment Service (Java 17 / Spring Boot).
# Handles: Maven build, Flyway DB migration, systemd.
#
# Run:  sudo bash scripts/deploy/deploy-payment.sh [--skip-build]
# ============================================================
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SKIP_BUILD=${1:-""}

GRN='\033[0;32m'; YEL='\033[1;33m'; RED='\033[0;31m'; BLU='\033[0;34m'; NC='\033[0m'
ok()   { echo -e "${GRN}[ OK ]${NC}  $*"; }
info() { echo -e "${BLU}[INFO]${NC}  $*"; }
warn() { echo -e "${YEL}[WARN]${NC}  $*"; }
die()  { echo -e "${RED}[FAIL]${NC}  $*"; exit 1; }

[[ $EUID -ne 0 ]] && die "Run as root: sudo bash scripts/deploy/deploy-payment.sh"

# ── Pre-flight checks ─────────────────────────────────────────
[[ -f /etc/emart/payment.env ]] || die "/etc/emart/payment.env not found. Run configure-env.sh first."
systemctl is-active --quiet postgresql || die "PostgreSQL is not running."
command -v java   &>/dev/null || die "Java 17+ not installed. Run install.sh first."
command -v mvn    &>/dev/null || die "Maven not installed. Run install.sh first."

JAVA_VER=$(java -version 2>&1 | head -1 | sed 's/.*"\(.*\)".*/\1/' | cut -d. -f1)
[[ "$JAVA_VER" -ge 17 ]] || die "Java 17+ required. Found: $JAVA_VER"

info "=== Deploying Payment Service (Java 17 + Spring Boot :8084) ==="

# Load env for healthcheck port
set -a; source /etc/emart/payment.env; set +a

# ── Maven build ───────────────────────────────────────────────
if [[ "$SKIP_BUILD" != "--skip-build" ]]; then
    info "Building JAR with Maven (tests skipped)..."
    cd "$REPO_DIR/payment-service"
    mvn clean package -DskipTests -q
    ok "JAR built: $(ls target/emart-payment-service-*.jar 2>/dev/null | head -1)"
    cd "$REPO_DIR"
else
    warn "Skipping Maven build (--skip-build)"
fi

# ── Create directories ────────────────────────────────────────
install -d -o emart -g emart /opt/emart/payment-service
install -d -o emart -g emart /var/log/emart
ok "Directories ready"

# ── Copy JAR ──────────────────────────────────────────────────
JAR=$(ls "$REPO_DIR/payment-service/target/emart-payment-service-*.jar" 2>/dev/null | head -1)
[[ -n "$JAR" ]] || die "No JAR found in payment-service/target/. Run without --skip-build."
cp "$JAR" /opt/emart/payment-service/emart-payment-service.jar
chown emart:emart /opt/emart/payment-service/emart-payment-service.jar
ok "JAR deployed: /opt/emart/payment-service/emart-payment-service.jar"

# ── Flyway DB migrations ──────────────────────────────────────
# Flyway runs automatically on Spring Boot start (flyway.enabled=true).
# We pre-validate here to catch issues before service start.
info "Spring Boot Flyway will run migrations on service startup..."

# ── Install systemd service ───────────────────────────────────
info "Installing systemd service..."
cat > /etc/systemd/system/emart-payment.service <<SERVICE
[Unit]
Description=Emart Payment Service (Java 17 + Spring Boot)
Documentation=https://github.com/emart/payment-service
After=network.target postgresql.service
Wants=postgresql.service

[Service]
Type=simple
User=emart
Group=emart
WorkingDirectory=/opt/emart/payment-service
EnvironmentFile=/etc/emart/payment.env
ExecStart=/usr/bin/java \
    -Xms256m -Xmx512m \
    -XX:+UseG1GC \
    -XX:MaxGCPauseMillis=200 \
    -Djava.security.egd=file:/dev/./urandom \
    -jar /opt/emart/payment-service/emart-payment-service.jar
Restart=on-failure
RestartSec=10
StartLimitBurst=3
StartLimitIntervalSec=60

# Logging
StandardOutput=append:/var/log/emart/payment-service.log
StandardError=append:/var/log/emart/payment-service.log

# Security
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ReadWritePaths=/var/log/emart
ProtectHome=true

[Install]
WantedBy=multi-user.target
SERVICE

systemctl daemon-reload
systemctl enable emart-payment
systemctl restart emart-payment
ok "systemd service emart-payment started"

# ── Wait for health ───────────────────────────────────────────
info "Waiting for Payment Service to become ready (Spring Boot starts in ~20s)..."
PORT="${PORT:-8084}"
for i in $(seq 1 40); do
    if curl -sf "http://localhost:${PORT}/health/ready" > /dev/null 2>&1; then
        ok "Payment Service is healthy on port ${PORT}"
        break
    fi
    if [[ $i -eq 40 ]]; then
        die "Payment Service did not become ready in 80s. Check: journalctl -u emart-payment -n 80"
    fi
    echo -n "."
    sleep 2
done

echo ""
ok "=== Payment Service deployed ==="
info "Endpoints:"
info "  Health:    http://localhost:${PORT}/health"
info "  Ready:     http://localhost:${PORT}/health/ready"
info "  Checkout:  http://localhost:${PORT}/api/v1/checkout"
info "  Orders:    http://localhost:${PORT}/api/v1/orders"
info "  Logs:      journalctl -u emart-payment -f"
