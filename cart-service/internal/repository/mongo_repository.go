package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/emart/cart-service/internal/config"
	"github.com/emart/cart-service/internal/model"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// ============================================================
// MongoRepository handles cart backup/persistence
// Database: cartdb
// Collection: carts
// ============================================================

type MongoRepository interface {
	UpsertCart(ctx context.Context, cart *model.Cart) error
	GetCart(ctx context.Context, userID string) (*model.Cart, error)
	GetCartsByStatus(ctx context.Context, status string) ([]model.Cart, error)
	UpdateCartStatus(ctx context.Context, userID, status string) error
	IsHealthy(ctx context.Context) error
}

type mongoRepository struct {
	collection *mongo.Collection
	timeout    time.Duration
}

func NewMongoRepository(cfg *config.Config) (MongoRepository, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	clientOpts := options.Client().
		ApplyURI(cfg.MongoDB.URI).
		SetServerSelectionTimeout(5 * time.Second).
		SetConnectTimeout(5 * time.Second)

	client, err := mongo.Connect(ctx, clientOpts)
	if err != nil {
		return nil, fmt.Errorf("MongoDB connection failed: %w", err)
	}

	if err := client.Ping(ctx, nil); err != nil {
		return nil, fmt.Errorf("MongoDB ping failed: %w", err)
	}

	collection := client.
		Database(cfg.MongoDB.Database).
		Collection(cfg.MongoDB.Collection)

	return &mongoRepository{
		collection: collection,
		timeout:    cfg.MongoDB.Timeout,
	}, nil
}

// UpsertCart inserts or updates a cart document in MongoDB
// Used by sync service for Redis → MongoDB backup
func (r *mongoRepository) UpsertCart(ctx context.Context, cart *model.Cart) error {
	ctx, cancel := context.WithTimeout(ctx, r.timeout)
	defer cancel()

	now := time.Now()
	cart.LastSyncAt = &now

	filter := bson.D{{Key: "user_id", Value: cart.UserID}}
	update := bson.D{{Key: "$set", Value: cart}}

	opts := options.Update().SetUpsert(true)
	_, err := r.collection.UpdateOne(ctx, filter, update, opts)
	if err != nil {
		return fmt.Errorf("MongoDB upsert failed for user %s: %w", cart.UserID, err)
	}

	return nil
}

// GetCart retrieves a cart from MongoDB by userID (used for fallback)
func (r *mongoRepository) GetCart(ctx context.Context, userID string) (*model.Cart, error) {
	ctx, cancel := context.WithTimeout(ctx, r.timeout)
	defer cancel()

	filter := bson.D{{Key: "user_id", Value: userID}}
	var cart model.Cart

	err := r.collection.FindOne(ctx, filter).Decode(&cart)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil
		}
		return nil, fmt.Errorf("MongoDB FindOne failed: %w", err)
	}

	return &cart, nil
}

// GetCartsByStatus retrieves carts by status (admin/reporting use)
func (r *mongoRepository) GetCartsByStatus(ctx context.Context, status string) ([]model.Cart, error) {
	ctx, cancel := context.WithTimeout(ctx, r.timeout)
	defer cancel()

	filter := bson.D{{Key: "status", Value: status}}
	opts := options.Find().SetSort(bson.D{{Key: "updated_at", Value: -1}}).SetLimit(100)

	cursor, err := r.collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, fmt.Errorf("MongoDB Find failed: %w", err)
	}
	defer cursor.Close(ctx)

	var carts []model.Cart
	if err := cursor.All(ctx, &carts); err != nil {
		return nil, fmt.Errorf("MongoDB cursor decode failed: %w", err)
	}

	return carts, nil
}

// UpdateCartStatus updates the status of a cart
func (r *mongoRepository) UpdateCartStatus(ctx context.Context, userID, status string) error {
	ctx, cancel := context.WithTimeout(ctx, r.timeout)
	defer cancel()

	filter := bson.D{{Key: "user_id", Value: userID}}
	update := bson.D{{Key: "$set", Value: bson.D{
		{Key: "status", Value: status},
		{Key: "updated_at", Value: time.Now()},
	}}}

	_, err := r.collection.UpdateOne(ctx, filter, update)
	return err
}

// IsHealthy pings MongoDB to verify connectivity
func (r *mongoRepository) IsHealthy(ctx context.Context) error {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	return r.collection.Database().Client().Ping(ctx, nil)
}
