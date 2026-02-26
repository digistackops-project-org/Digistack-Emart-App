# Emart Cart Service v1.0 — README

## Quick Start (Local — 1 Command)

```bash
docker-compose up -d

# Wait ~60s for Java login service to start, then:
open http://localhost:3000   # Frontend
curl http://localhost:8080/health/ready  # Login API
curl http://localhost:8081/health/ready  # Cart API

# Optional tools (Mongo Express + Redis Commander):
docker-compose --profile tools up -d
# Mongo Express: http://localhost:8082
# Redis Commander: http://localhost:8083
```

---

## Architecture Overview

```
Browser
  └── Nginx (port 3000)
        ├── /api/*         → Login Service :8080  (Java Spring Boot)
        ├── /cart-api/*    → Cart Service  :8081  (Go + Gin)
        └── /*             → React SPA (index.html)

Cart Service Storage:
  Active Reads/Writes → Redis  (TTL: 7 days)
  Backup / Fallback  → MongoDB (database: cart, collection: carts)
  Background Sync    → goroutine every 30s: Redis → MongoDB
```

---

## Team Ownership & Deploy Order

| Step | Team | What They Do |
|------|------|-------------|
| 1 | **DB Team** | Start MongoDB + Redis. Run DB migration pipeline. |
| 2 | **Backend Team** | Deploy Go cart service (Mongock runs on startup). |
| 3 | **Frontend Team** | Deploy React frontend after APIs are healthy. |

---

## Running Tests

### Cart Backend (Go)
```bash
cd cart-service

# 1. Unit tests (no Docker)
make test-unit
# go test ./tests/unit/... -v -cover

# 2. Integration tests (needs Docker)
make test-integration
# go test ./tests/integration/... -v -timeout 180s

# 3. API tests (needs running instance + valid JWT)
JWT_TOKEN=<token> API_BASE_URL=http://localhost:8081 make test-api
```

### Frontend (React)
```bash
cd frontend
npm test -- --watchAll=false

# With coverage
npm test -- --watchAll=false --coverage
```

---

## DB Migrations

Migrations run **automatically on cart service startup** via the Go Mongock runner.

```bash
# Check migration status manually
mongosh "mongodb://admin:admin123@localhost:27018" \
    --file scripts/db/check-migration-status.js

# Run individual migration manually (DB team only)
mongosh "mongodb://admin:admin123@localhost:27018" \
    --file scripts/db/V001_CreateCartsCollection.js
mongosh "mongodb://admin:admin123@localhost:27018" \
    --file scripts/db/V002_AddCartIndexes.js
mongosh "mongodb://admin:admin123@localhost:27018" \
    --file scripts/db/V003_AddSchemaValidation.js

# Emergency rollback (after restoring backup)
mongosh "mongodb://admin:admin123@localhost:27018" \
    --file scripts/db/rollback-all-migrations.js
```

| Migration | ID | What It Does |
|-----------|-----|-------------|
| V001 | V001_CreateCartsCollection | Creates `carts` collection in `cart` database |
| V002 | V002_AddCartIndexes | Unique `user_id` index + performance indexes |
| V003 | V003_AddSchemaValidation | MongoDB JSON schema — validates category enum (books/courses/software), required fields |

---

## Cart API Reference

All `/api/v1/cart*` endpoints require `Authorization: Bearer <JWT>` from Login service.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | General health |
| GET | `/health/live` | Liveness probe |
| GET | `/health/ready` | Readiness (checks Redis + MongoDB) |
| GET | `/api/v1/cart` | Get full cart |
| GET | `/api/v1/cart/summary` | Lightweight cart for header badge |
| POST | `/api/v1/cart/items` | Add item `{product_id, product_name, category, price, quantity}` |
| PUT | `/api/v1/cart/items/:itemId` | Update quantity `{quantity}` (0 = remove) |
| DELETE | `/api/v1/cart/items/:itemId` | Remove specific item |
| DELETE | `/api/v1/cart` | Clear entire cart |

Valid `category` values: **`books`**, **`courses`**, **`software`**

---

## Environment Variables (Cart Service)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MONGO_URI` | ✅ | — | MongoDB connection string |
| `MONGO_DATABASE` | ✅ | `cart` | MongoDB database name |
| `REDIS_ADDR` | ✅ | `localhost:6379` | Redis address |
| `REDIS_PASSWORD` | — | `""` | Redis auth password |
| `JWT_SECRET` | ✅ | — | **Must match Login service secret** |
| `SERVER_PORT` | — | `8081` | HTTP listen port |
| `APP_ENV` | — | `dev` | `dev` / `staging` / `prod` |
| `GIN_MODE` | — | `debug` | `debug` / `release` |
| `REDIS_CART_TTL` | — | `168h` | Cart TTL in Redis (7 days) |
| `SYNC_INTERVAL` | — | `30s` | Redis → MongoDB sync frequency |

---

## Future Phases

- **Phase 2**: Books microservice (browse, search, product detail)
- **Phase 3**: Courses microservice
- **Phase 4**: Software microservice
- **Phase 5**: Payment / Checkout service
- **Phase 6**: Order history service

Each future microservice will add its own header button, own API routes, and own DB migrations following this same pattern.
