#!/bin/bash
# ============================================================
# scripts/deploy/deploy-courses.sh
# Builds and deploys the Course Service (Python/FastAPI).
# Handles: venv setup, pip install, Flyway DB migration, systemd.
#
# Run:  sudo bash scripts/deploy/deploy-courses.sh [--skip-build]
# ============================================================
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SKIP_BUILD=${1:-""}

GRN='\033[0;32m'; YEL='\033[1;33m'; RED='\033[0;31m'; BLU='\033[0;34m'; NC='\033[0m'
ok()   { echo -e "${GRN}[ OK ]${NC}  $*"; }
info() { echo -e "${BLU}[INFO]${NC}  $*"; }
warn() { echo -e "${YEL}[WARN]${NC}  $*"; }
die()  { echo -e "${RED}[FAIL]${NC}  $*"; exit 1; }

[[ $EUID -ne 0 ]] && die "Run as root: sudo bash scripts/deploy/deploy-courses.sh"

# ── Pre-flight checks ─────────────────────────────────────────
[[ -f /etc/emart/course.env ]] || die "/etc/emart/course.env not found. Run configure-env.sh first."
systemctl is-active --quiet postgresql || die "PostgreSQL is not running. Start with: systemctl start postgresql"
command -v python3 &>/dev/null || die "Python 3 not installed. Run install.sh first."

info "=== Deploying Course Service (Python/FastAPI) ==="

# Load env for DB migration
set -a; source /etc/emart/course.env; set +a

# ── Create directories ────────────────────────────────────────
install -d -o emart -g emart /opt/emart/course-service
install -d -o emart -g emart /var/log/emart
ok "Directories ready"

# ── Copy source code ──────────────────────────────────────────
rsync -a --delete \
    --exclude '__pycache__' \
    --exclude '*.pyc' \
    --exclude '.env' \
    --exclude 'tests/' \
    --exclude '.pytest_cache' \
    "$REPO_DIR/course-service/" /opt/emart/course-service/
ok "Source files copied to /opt/emart/course-service/"

# ── Python virtual environment + pip install ──────────────────
if [[ "$SKIP_BUILD" != "--skip-build" ]]; then
    info "Setting up Python virtual environment..."
    python3 -m venv /opt/emart/course-service/venv
    /opt/emart/course-service/venv/bin/pip install --quiet --upgrade pip
    /opt/emart/course-service/venv/bin/pip install --quiet \
        -r /opt/emart/course-service/requirements.txt
    ok "Python dependencies installed"
else
    warn "Skipping pip install (--skip-build)"
fi

chown -R emart:emart /opt/emart/course-service

# ── Run Flyway DB migrations ──────────────────────────────────
info "Running Flyway DB migrations on coursedb..."
if command -v flyway &>/dev/null; then
    DB_PASSWORD="${DB_PASSWORD:-}" \
    DB_HOST="${DB_HOST:-localhost}" \
    DB_NAME="${DB_NAME:-coursedb}" \
    DB_USER="${DB_USER:-emart_course}" \
    bash "$REPO_DIR/course-service/db/run-flyway.sh" migrate
    ok "Flyway migrations applied"
else
    warn "Flyway CLI not found — skipping migration. Run manually: bash course-service/db/run-flyway.sh migrate"
fi

# ── Install systemd service ───────────────────────────────────
info "Installing systemd service..."
cat > /etc/systemd/system/emart-course.service <<SERVICE
[Unit]
Description=Emart Course Service (Python/FastAPI)
Documentation=https://github.com/emart/course-service
After=network.target postgresql.service
Wants=postgresql.service

[Service]
Type=simple
User=emart
Group=emart
WorkingDirectory=/opt/emart/course-service
EnvironmentFile=/etc/emart/course.env
ExecStart=/opt/emart/course-service/venv/bin/python run.py
Restart=on-failure
RestartSec=10
StartLimitBurst=3
StartLimitIntervalSec=60

# Logging
StandardOutput=append:/var/log/emart/course-service.log
StandardError=append:/var/log/emart/course-service.log

# Security hardening
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ReadWritePaths=/var/log/emart /opt/emart/course-service
ProtectHome=true

[Install]
WantedBy=multi-user.target
SERVICE

systemctl daemon-reload
systemctl enable emart-course
systemctl restart emart-course
ok "systemd service emart-course started"

# ── Wait for health check ─────────────────────────────────────
info "Waiting for Course Service to become ready..."
PORT="${PORT:-8083}"
for i in $(seq 1 30); do
    if curl -sf "http://localhost:${PORT}/health/ready" > /dev/null 2>&1; then
        ok "Course Service is healthy on port ${PORT}"
        break
    fi
    if [[ $i -eq 30 ]]; then
        die "Course Service did not become ready in 30s. Check logs: journalctl -u emart-course -n 50"
    fi
    echo -n "."
    sleep 3
done

echo ""
ok "=== Course Service deployed successfully ==="
info "Endpoints:"
info "  Health:      http://localhost:${PORT}/health"
info "  Liveness:    http://localhost:${PORT}/health/live"
info "  Readiness:   http://localhost:${PORT}/health/ready"
info "  API:         http://localhost:${PORT}/api/v1/courses"
info "  Logs:        journalctl -u emart-course -f"
info "  Log file:    tail -f /var/log/emart/course-service.log"
