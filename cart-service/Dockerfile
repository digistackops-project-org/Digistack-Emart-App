# =============================================================
# Emart Cart Service - Multi-Stage Dockerfile (Go)
# Stage 1: Build  |  Stage 2: Runtime
# =============================================================

# Stage 1: Build
FROM golang:1.21-alpine AS build

WORKDIR /app
RUN apk add --no-cache git ca-certificates

# Cache dependencies
COPY go.mod go.sum ./
RUN go mod download

# Build binary
COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
    go build -ldflags="-w -s -X main.version=${VERSION:-1.0.0}" \
    -o cart-service ./cmd/server/main.go

# =============================================================
# Stage 2: Minimal runtime image
# =============================================================
FROM alpine:3.19 AS runtime

RUN apk add --no-cache ca-certificates tzdata wget && \
    addgroup -S emart && adduser -S emart -G emart

WORKDIR /app
COPY --from=build /app/cart-service .
RUN chown emart:emart cart-service

USER emart
EXPOSE 8081

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD wget -q --spider http://localhost:8081/health/ready || exit 1

ENTRYPOINT ["./cart-service"]
