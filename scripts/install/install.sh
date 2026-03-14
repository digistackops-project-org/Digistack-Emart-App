#!/bin/bash
# ============================================================
# scripts/install/install.sh
# One-time setup on a fresh Ubuntu 22.04 / 24.04 server.
# Installs: Java 21, Go 1.22, Node.js 18, Maven 3.9,
#           Python 3.12, MongoDB 7, Redis 7, PostgreSQL 16,
#           Nginx. Creates emart user + all opt/emart dirs.
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
    apt-transport-https ca-certificates lsb-release unzip git rsync \
    build-essential

# ── Java 21 (Eclipse Temurin) ─────────────────────────────────
info "Installing Java 21 (Eclipse Temurin)..."
if java -version 2>&1 | grep -qE '"21'; then
    ok "Java 21 already installed"
else
    apt-get remove -y -qq openjdk-17-jdk-headless 2>/dev/null || true
    wget -qO - https://packages.adoptium.net/artifactory/api/gpg/key/public | \
        gpg --dearmor -o /usr/share/keyrings/adoptium.gpg
    echo "deb [signed-by=/usr/share/keyrings/adoptium.gpg] \
https://packages.adoptium.net/artifactory/deb $(lsb_release -cs) main" \
        > /etc/apt/sources.list.d/adoptium.list
    apt-get update -qq
    apt-get install -y -qq temurin-21-jdk
    ok "Java 21 installed"
fi
JAVA_HOME=$(readlink -f /usr/bin/java | sed 's/\/bin\/java//')
export JAVA_HOME

# ── Maven 3.9 ────────────────────────────────────────────────
info "Installing Maven 3.9..."
if command -v mvn &>/dev/null && mvn --version 2>/dev/null | grep -q "3.9"; then
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

# ── Go 1.22 ──────────────────────────────────────────────────
info "Installing Go 1.22..."
GO_VERSION="1.22.3"
if command -v go &>/dev/null && go version | grep -qE "go1.2[2-9]"; then
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

# ── Node.js 18 LTS ───────────────────────────────────────────
info "Installing Node.js 18..."
if node --version 2>&1 | grep -qE "v18|v20"; then
    ok "Node.js already installed: $(node --version)"
else
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y -qq nodejs
    ok "Node.js $(node --version) installed"
fi

# ── Python 3.12 ──────────────────────────────────────────────
info "Installing Python 3.12..."
if python3 --version 2>&1 | grep -qE "3.1[2-9]"; then
    ok "Python 3.12 already installed"
else
    add-apt-repository -y ppa:deadsnakes/ppa
    apt-get update -qq
    apt-get install -y -qq python3.12 python3.12-venv python3.12-dev python3-pip
    update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.12 1
    ok "Python $(python3 --version) installed"
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
    sed -i 's/^bind 127.0.0.1 -::1/bind 127.0.0.1/' /etc/redis/redis.conf
    sed -i 's/^protected-mode no/protected-mode yes/'  /etc/redis/redis.conf
    systemctl enable redis-server
    systemctl start  redis-server
    ok "Redis installed and started"
fi

# ── PostgreSQL 16 ────────────────────────────────────────────
info "Installing PostgreSQL 16..."
if systemctl is-active --quiet postgresql 2>/dev/null; then
    ok "PostgreSQL already running"
else
    curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | \
        gpg --dearmor -o /usr/share/keyrings/pgdg.gpg
    echo "deb [signed-by=/usr/share/keyrings/pgdg.gpg] \
https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" \
        > /etc/apt/sources.list.d/pgdg.list
    apt-get update -qq
    apt-get install -y -qq postgresql-16 postgresql-client-16
    systemctl enable postgresql
    systemctl start  postgresql
    sleep 2
    ok "PostgreSQL 16 installed and started"
fi

# ── Nginx ────────────────────────────────────────────────────
info "Installing Nginx..."
apt-get install -y -qq nginx
systemctl enable nginx
ok "Nginx installed"

# ── System user + all service directories ────────────────────
info "Creating emart system user and deployment directories..."
id emart &>/dev/null || useradd -r -s /bin/false -d /opt/emart emart

for svc in login-service cart-service books-service course-service \
           payment-service profile-service notification-service; do
    mkdir -p /opt/emart/$svc
    chown emart:emart /opt/emart/$svc
done

mkdir -p /var/www/emart/frontend
mkdir -p /var/log/emart
mkdir -p /etc/emart

chown emart:emart /var/log/emart
chown www-data:www-data /var/www/emart/frontend
chmod 750 /etc/emart
ok "All directories created"

echo ""
echo "══════════════════════════════════════════════════════"
ok "All dependencies installed!"
echo "══════════════════════════════════════════════════════"
echo ""
echo "  Java:       $(java -version 2>&1 | head -1)"
echo "  Maven:      $(mvn --version 2>/dev/null | head -1)"
echo "  Go:         $(go version 2>/dev/null || echo 'run: source /etc/profile.d/go.sh')"
echo "  Node.js:    $(node --version)"
echo "  Python:     $(python3 --version)"
echo "  MongoDB:    $(mongod --version 2>/dev/null | head -1 || echo 'started')"
echo "  Redis:      $(redis-cli ping 2>/dev/null && echo 'PONG' || echo 'started')"
echo "  PostgreSQL: $(psql --version)"
echo "  Nginx:      $(nginx -v 2>&1)"
echo ""
echo "Next steps:"
echo "  sudo bash scripts/install/setup-mongodb.sh"
echo "  sudo bash scripts/install/setup-postgresql.sh"
echo "  sudo bash scripts/install/configure-env.sh"
echo "  sudo bash scripts/deploy/deploy-all.sh"
