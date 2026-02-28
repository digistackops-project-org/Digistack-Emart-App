#!/bin/bash
# ============================================================
# scripts/install/install.sh
# One-time setup on a fresh Ubuntu 22.04 / 24.04 server.
# Installs: Java 17, Go 1.21, Node.js 18, Maven, MongoDB 7,
#           Redis 7, Nginx. Creates emart user + directories.
#
# Run:  sudo bash scripts/install/install.sh
# ============================================================
set -euo pipefail

RED='\033[0;31m'; GRN='\033[0;32m'; YEL='\033[1;33m'; BLU='\033[0;34m'; NC='\033[0m'
info() { echo -e "${BLU}[INFO]${NC}  $*"; }
ok()   { echo -e "${GRN}[ OK ]${NC}  $*"; }
warn() { echo -e "${YEL}[WARN]${NC}  $*"; }
die()  { echo -e "${RED}[FAIL]${NC}  $*"; exit 1; }

[[ $EUID -ne 0 ]] && die "Run as root:  sudo bash $0"

info "=== Emart Physical Server — Dependency Installer ==="
apt-get update -qq
apt-get install -y -qq curl wget gnupg2 software-properties-common \
    apt-transport-https ca-certificates lsb-release unzip git rsync

# ── Java 17 ──────────────────────────────────────────────────
info "Installing Java 17..."
if java -version 2>&1 | grep -qE "17|21"; then
    ok "Java already installed"
else
    apt-get install -y -qq openjdk-17-jdk-headless
    ok "Java 17 installed"
fi

# ── Go 1.21 ──────────────────────────────────────────────────
info "Installing Go 1.21..."
GO_VERSION="1.21.6"
if command -v go &>/dev/null && go version | grep -q "1.21"; then
    ok "Go already installed: $(go version)"
else
    wget -q "https://go.dev/dl/go${GO_VERSION}.linux-amd64.tar.gz" -O /tmp/go.tar.gz
    rm -rf /usr/local/go
    tar -C /usr/local -xzf /tmp/go.tar.gz
    rm /tmp/go.tar.gz
    echo 'export PATH=$PATH:/usr/local/go/bin' > /etc/profile.d/go.sh
    export PATH=$PATH:/usr/local/go/bin
    ok "Go $GO_VERSION installed"
fi

# ── Maven 3.9 ────────────────────────────────────────────────
info "Installing Maven 3.9..."
if command -v mvn &>/dev/null; then
    ok "Maven already installed"
else
    MVN_VER="3.9.6"
    wget -q "https://dlcdn.apache.org/maven/maven-3/${MVN_VER}/binaries/apache-maven-${MVN_VER}-bin.tar.gz" \
         -O /tmp/maven.tar.gz
    tar -C /opt -xzf /tmp/maven.tar.gz
    ln -sf /opt/apache-maven-${MVN_VER}/bin/mvn /usr/local/bin/mvn
    rm /tmp/maven.tar.gz
    ok "Maven $MVN_VER installed"
fi

# ── Node.js 18 ───────────────────────────────────────────────
info "Installing Node.js 18..."
if node --version 2>&1 | grep -qE "v18|v20"; then
    ok "Node.js already installed"
else
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y -qq nodejs
    ok "Node.js $(node --version) installed"
fi

# ── MongoDB 7.0 ──────────────────────────────────────────────
info "Installing MongoDB 7.0..."
if systemctl is-active --quiet mongod 2>/dev/null; then
    ok "MongoDB already running"
else
    curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
        gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
    echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] \
        https://repo.mongodb.org/apt/ubuntu $(lsb_release -cs)/mongodb-org/7.0 multiverse" \
        > /etc/apt/sources.list.d/mongodb-org-7.0.list
    apt-get update -qq
    apt-get install -y -qq mongodb-org

    # Bind to localhost only (security)
    sed -i 's/^  bindIp:.*/  bindIp: 127.0.0.1/' /etc/mongod.conf

    systemctl daemon-reload
    systemctl enable mongod
    systemctl start  mongod
    sleep 3
    ok "MongoDB 7.0 installed and started"
fi

# ── Redis 7 ──────────────────────────────────────────────────
info "Installing Redis..."
if systemctl is-active --quiet redis-server 2>/dev/null; then
    ok "Redis already running"
else
    apt-get install -y -qq redis-server
    # Bind to localhost, enable password (set during configure-env.sh)
    sed -i 's/^bind 127.0.0.1 -::1/bind 127.0.0.1/' /etc/redis/redis.conf
    sed -i 's/^protected-mode no/protected-mode yes/'  /etc/redis/redis.conf
    systemctl enable redis-server
    systemctl start  redis-server
    ok "Redis installed and started"
fi

# ── Nginx ────────────────────────────────────────────────────
info "Installing Nginx..."
apt-get install -y -qq nginx
systemctl enable nginx
ok "Nginx installed"

# ── System user + directories ────────────────────────────────
info "Creating emart user and directories..."
id emart &>/dev/null || useradd -r -s /bin/false -d /opt/emart emart
mkdir -p /opt/emart/login-service /opt/emart/cart-service
mkdir -p /var/www/emart/frontend
mkdir -p /var/log/emart
mkdir -p /etc/emart
chown -R emart:emart /opt/emart /var/log/emart
chown    www-data:www-data /var/www/emart/frontend
chmod    750 /etc/emart
ok "Directories created"

echo ""
echo "══════════════════════════════════════════════════════"
ok "All dependencies installed!"
echo "══════════════════════════════════════════════════════"
echo ""
echo "  Java:    $(java -version 2>&1 | head -1)"
echo "  Go:      $(go version 2>/dev/null || echo 'source /etc/profile.d/go.sh')"
echo "  Node:    $(node --version)"
echo "  MongoDB: $(mongod --version | head -1)"
echo "  Redis:   $(redis-server --version)"
echo "  Nginx:   $(nginx -v 2>&1)"
echo ""
echo "Next step:"
echo "  sudo bash scripts/install/setup-mongodb.sh"
