# Emart — Microservices E-Commerce Platform

Complete source code for all 7 backend services, React frontend, Nginx config, and deploy scripts.

## Services

| Service | Stack | Port | Database |
|---------|-------|------|----------|
| login-service | Java 21 / Spring Boot | :8080 | MongoDB (userdb) |
| cart-service | Go 1.22 / Gin | :8081 | MongoDB + Redis |
| books-service | Node.js 18 / Express | :8082 | PostgreSQL (booksdb) |
| course-service | Python 3.12 / FastAPI | :8083 | PostgreSQL (coursedb) |
| payment-service | Java 21 / Spring Boot | :8084 | PostgreSQL (paymentdb) |
| profile-service | Node.js 18 / Express | :8086 | PostgreSQL (profiledb) |
| notification-service | Node.js 18 / Nodemailer | :8088 | None |
| frontend | React 18 | :80 (via Nginx) | — |

## Quick Start

```bash
# 1. Install all runtimes (Ubuntu 22.04)
sudo bash scripts/install/install.sh

# 2. Set up MongoDB
sudo bash scripts/install/setup-mongodb.sh

# 3. Set up PostgreSQL databases
sudo bash scripts/install/setup-postgresql.sh

# 4. Configure all env files
sudo bash scripts/install/configure-env.sh

# 5. Deploy everything
sudo bash scripts/deploy/deploy-all.sh
```

## Deployment Guide

See **Emart_Complete_Deployment_Guide.docx** for full instructions including:
- Server prerequisites and sizing
- Step-by-step installation and configuration
- All API endpoint references
- Troubleshooting guide
- Test credentials and payment test cards

## Default Credentials

- **Admin login:** admin@emart.com / Admin@123
- **Test payment (fail):** card 4000000000000002 or UPI fail@upi
