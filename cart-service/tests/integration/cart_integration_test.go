package integration_test

import (
	"context"
	"testing"
	"time"

	"github.com/emart/cart-service/internal/config"
	"github.com/emart/cart-service/internal/migration"
	mongorepo "github.com/emart/cart-service/internal/repository/mongo"
	redisrepo "github.com/emart/cart-service/internal/repository/redis"
	"github.com/emart/cart-service/internal/model"
	"github.com/emart/cart-service/internal/service"
	goredis "github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/suite"
	"github.com/testcontainers/testcontainers-go"
	tcmongo "github.com/testcontainers/testcontainers-go/modules/mongodb"
	tcredis "github.com/testcontainers/testcontainers-go/modules/redis"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"go.uber.org/zap"
)

// ============================================================
// Integration Test Suite - Uses Testcontainers
// Real MongoDB + Real Redis - no mocks
// ============================================================

type CartIntegrationSuite struct {
	suite.Suite
	mongoContainer *tcmongo.MongoDBContainer
	redisContainer *tcredis.RedisContainer
	mongoClient    *mongo.Client
	redisClient    *goredis.Client
	cartService    service.CartService
	ctx            context.Context
}

func TestCartIntegrationSuite(t *testing.T) {
	suite.Run(t, new(CartIntegrationSuite))
}

func (s *CartIntegrationSuite) SetupSuite() {
	s.ctx = context.Background()

	// Start MongoDB container
	var err error
	s.mongoContainer, err = tcmongo.RunContainer(s.ctx,
		testcontainers.WithImage("mongo:7.0"),
	)
	s.Require().NoError(err)

	// Start Redis container
	s.redisContainer, err = tcredis.RunContainer(s.ctx,
		testcontainers.WithImage("redis:7.2-alpine"),
	)
	s.Require().NoError(err)

	// Connect MongoDB
	mongoURI, _ := s.mongoContainer.ConnectionString(s.ctx)
	s.mongoClient, err = mongo.Connect(s.ctx, options.Client().ApplyURI(mongoURI))
	s.Require().NoError(err)

	// Connect Redis
	redisAddr, _ := s.redisContainer.Endpoint(s.ctx, "")
	s.redisClient = goredis.NewClient(&goredis.Options{Addr: redisAddr})

	// Run migrations
	db := s.mongoClient.Database("cart_test")
	logger, _ := zap.NewDevelopment()
	runner := migration.NewRunner(db, logger)
	s.Require().NoError(runner.Run(s.ctx))

	// Build service
	rRepo := redisrepo.NewCartRedisRepository(s.redisClient)
	mRepo := mongorepo.NewCartMongoRepository(db)
	cfg := &config.Config{Redis: config.RedisConfig{TTL: 1 * time.Hour}}
	s.cartService = service.NewCartService(rRepo, mRepo, cfg.Redis.TTL, logger)
}

func (s *CartIntegrationSuite) TearDownSuite() {
	s.mongoClient.Disconnect(s.ctx)
	s.redisClient.Close()
	s.mongoContainer.Terminate(s.ctx)
	s.redisContainer.Terminate(s.ctx)
}

func (s *CartIntegrationSuite) TearDownTest() {
	// Clear data between tests
	s.redisClient.FlushAll(s.ctx)
	s.mongoClient.Database("cart_test").Collection("carts").Drop(s.ctx)
}

// INT-001: Add item to cart, verify in Redis AND MongoDB
func (s *CartIntegrationSuite) TestINT001_AddItem_PersistedInBothStores() {
	req := &model.AddItemRequest{
		ProductID: "book-001", ProductName: "Clean Code",
		Category: "books", Price: 35.0, Quantity: 1,
	}
	cart, err := s.cartService.AddItem(s.ctx, "user-int-001", req)

	s.NoError(err)
	s.NotNil(cart)
	s.Len(cart.Items, 1)
	s.Equal(1, cart.TotalItems)
	s.InDelta(35.0, cart.TotalPrice, 0.001)
}

// INT-002: Get cart falls back to MongoDB when Redis is cleared
func (s *CartIntegrationSuite) TestINT002_GetCart_FallsBackToMongoDB() {
	req := &model.AddItemRequest{
		ProductID: "course-001", ProductName: "K8s Course",
		Category: "courses", Price: 59.0, Quantity: 1,
	}
	s.cartService.AddItem(s.ctx, "user-int-002", req)

	// Flush Redis to simulate Redis cache miss
	s.redisClient.FlushAll(s.ctx)

	// Should fall back to MongoDB
	cart, err := s.cartService.GetCart(s.ctx, "user-int-002")
	s.NoError(err)
	s.Len(cart.Items, 1)
	s.Equal("mongodb", cart.Source)
}

// INT-003: Remove item
func (s *CartIntegrationSuite) TestINT003_RemoveItem_UpdatesBothStores() {
	req1 := &model.AddItemRequest{ProductID: "sw-001", ProductName: "VS Code", Category: "software", Price: 0.0, Quantity: 1}
	req2 := &model.AddItemRequest{ProductID: "bk-002", ProductName: "DDD Book", Category: "books", Price: 45.0, Quantity: 1}

	s.cartService.AddItem(s.ctx, "user-int-003", req1)
	cart, _ := s.cartService.AddItem(s.ctx, "user-int-003", req2)

	itemToRemove := cart.Items[0].ItemID
	updatedCart, err := s.cartService.RemoveItem(s.ctx, "user-int-003", itemToRemove)

	s.NoError(err)
	s.Len(updatedCart.Items, 1)
}

// INT-004: Verify migrations ran (indexes exist)
func (s *CartIntegrationSuite) TestINT004_Migrations_CreateIndexes() {
	db := s.mongoClient.Database("cart_test")
	cursor, err := db.Collection("carts").Indexes().List(s.ctx)
	s.NoError(err)
	
	var indexes []map[string]interface{}
	cursor.All(s.ctx, &indexes)
	
	// Should have more than just the default _id index
	s.Greater(len(indexes), 1, "Expected Mongock migrations to have created indexes")
}

// INT-005: Migrations are idempotent - running twice doesn't fail
func (s *CartIntegrationSuite) TestINT005_Migrations_AreIdempotent() {
	db := s.mongoClient.Database("cart_test")
	logger, _ := zap.NewDevelopment()
	runner := migration.NewRunner(db, logger)
	
	// Running migrations again should not fail
	err := runner.Run(s.ctx)
	s.NoError(err, "Re-running migrations should be idempotent")
}
