# Emart Monorepo — Physical Server Deployment

Single repository containing all three services deployed directly on an Ubuntu server (no Docker, no Kubernetes).

```
emart/
├── login-service/          Java 17 + Spring Boot 3.2   (port 8080)
├── cart-service/           Go 1.21 + Gin               (port 8081)
├── frontend/               React 18                    (Nginx port 80)
├── nginx/emart.conf        Reverse proxy configuration
├── config/                 Environment variable templates
└── scripts/
    ├── install/            One-time server setup (3 scripts)
    └── deploy/             Per-service deploy scripts
```

## Architecture

```
Browser
  │  GET /              → Nginx → /var/www/emart/frontend  (React SPA)
  │  POST /api/*        → Nginx → localhost:8080          (Login Service)
  │  POST /cart-api/*   → Nginx → localhost:8081          (Cart Service)
  └──────────────────────────────────────────────────────────
                         MongoDB 127.0.0.1:27017
                           ├─ userdb  (login-service)
                           └─ cart    (cart-service)
                         Redis   127.0.0.1:6379
                           └─ cart:*  (cart-service primary store)
```

## Quick Start — First-Time Setup

```bash
git clone https://github.com/your-org/emart.git
cd emart

# 1. Install all server dependencies (Java, Go, Node, MongoDB, Redis, Nginx)
sudo bash scripts/install/install.sh

# 2. Create MongoDB databases and users
sudo bash scripts/install/setup-mongodb.sh

# 3. Write /etc/emart/login.env and /etc/emart/cart.env
sudo bash scripts/install/configure-env.sh

# 4. Deploy everything
sudo bash scripts/deploy/deploy-all.sh
```

## Redeploy

```bash
# All services
sudo bash scripts/deploy/deploy-all.sh

# Individual services
sudo bash scripts/deploy/deploy-login.sh
sudo bash scripts/deploy/deploy-cart.sh
sudo bash scripts/deploy/deploy-frontend.sh

# Skip rebuild (restart with existing compiled artifacts)
sudo bash scripts/deploy/deploy-all.sh --skip-build
```

## Service Management

```bash
sudo systemctl status  emart-login emart-cart nginx mongod redis-server
sudo systemctl restart emart-login
sudo systemctl restart emart-cart
sudo systemctl reload  nginx

# Logs
journalctl -u emart-login -f
journalctl -u emart-cart  -f
tail -f /var/log/emart/login-service.log
tail -f /var/log/emart/cart-service.log
```

## Health Endpoints

| Service         | URL                                       |
|-----------------|-------------------------------------------|
| Login (direct)  | `http://localhost:8080/health/ready`      |
| Cart (direct)   | `http://localhost:8081/health/ready`      |
| Login (Nginx)   | `http://server-ip/api/v1/health/ready`    |
| Cart (Nginx)    | `http://server-ip/cart-api/health/ready`  |
| Nginx           | `http://server-ip/nginx-health`           |

## Running Tests

```bash
# Login Service (Java)
cd login-service
mvn test                               # Unit tests (JaCoCo min 80%)
mvn verify -P integration-test         # Unit + Integration (Testcontainers)
API_BASE_URL=http://localhost:8080 mvn test -P api-test

# Cart Service (Go)
cd cart-service
make test-unit                         # Unit tests
make test-integration                  # Integration (Testcontainers)
JWT_TOKEN=<token> API_BASE_URL=http://localhost:8081 make test-api

# Frontend (React)
cd frontend
npm test -- --watchAll=false           # Component tests
npm run test:ci                        # CI mode with coverage
```

## Environment Variables

Config files live in `/etc/emart/` (chmod 640, owned root:emart).

| Variable           | Service  | Description                            |
|--------------------|----------|----------------------------------------|
| `SPRING_PROFILE`   | Login    | `dev` or `prod`                        |
| `MONGO_URI`        | Both     | MongoDB connection URI                 |
| `JWT_SECRET`       | Both     | **MUST be identical in both files**    |
| `JWT_EXPIRATION_MS`| Login    | Token lifetime in ms (default 3600000) |
| `REDIS_PASSWORD`   | Cart     | Redis auth password                    |
| `SYNC_INTERVAL`    | Cart     | Redis→MongoDB sync interval (30s)      |

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Login service 401 on cart API | `JWT_SECRET` mismatch. Verify both env files are identical, restart both services. |
| Cart health 503 | Check Redis: `redis-cli -a $PASS ping`; Check MongoDB: `mongosh` |
| Migration lock stuck | `mongosh cart --eval 'db.mongockLock.updateOne({_id:"migration-lock"},{$set:{locked:false}})'` |
| Frontend blank page | Check Nginx: `nginx -t`, verify `/var/www/emart/frontend/index.html` exists |
| 502 Bad Gateway | Service not running on expected port: `ss -tlnp \| grep 8080` |

```bash
# Diagnostic one-liner
systemctl status emart-login emart-cart nginx mongod redis-server
ss -tlnp | grep -E '80|8080|8081|27017|6379'
curl -s http://localhost:8080/health/ready | python3 -m json.tool
curl -s http://localhost:8081/health/ready | python3 -m json.tool
```
