.PHONY: build test test-unit test-integration test-api run docker-build

APP_NAME=emart-cart-service
VERSION?=1.0.0

build:
	go build -o bin/$(APP_NAME) ./cmd/server/main.go

run:
	go run ./cmd/server/main.go

test-unit:
	@echo "Running unit tests..."
	go test ./tests/unit/... -v -cover -coverprofile=coverage.out
	go tool cover -html=coverage.out -o coverage.html

test-integration:
	@echo "Running integration tests (requires Docker)..."
	go test ./tests/integration/... -v -timeout 120s

test-api:
	@echo "Running API tests against deployed instance..."
	go test ./tests/api/... -v -tags=api

test: test-unit test-integration

docker-build:
	docker build -t $(APP_NAME):$(VERSION) --build-arg VERSION=$(VERSION) .

lint:
	golangci-lint run ./...
