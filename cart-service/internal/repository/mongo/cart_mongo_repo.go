package mongorepo

import (
	"context"
	"fmt"
	"time"

	"github.com/emart/cart-service/internal/model"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// CartMongoRepository interface
type CartMongoRepository interface {
	GetCart(ctx context.Context, userID string) (*model.Cart, error)
	UpsertCart(ctx context.Context, cart *model.Cart) error
	DeleteCart(ctx context.Context, userID string) error
	Ping(ctx context.Context) error
}

type cartMongoRepo struct {
	collection *mongo.Collection
}

func NewCartMongoRepository(db *mongo.Database) CartMongoRepository {
	return &cartMongoRepo{
		collection: db.Collection("carts"),
	}
}

// GetCart retrieves cart from MongoDB (fallback when Redis misses)
func (r *cartMongoRepo) GetCart(ctx context.Context, userID string) (*model.Cart, error) {
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	var cart model.Cart
	err := r.collection.FindOne(ctx, bson.M{"user_id": userID}).Decode(&cart)
	if err == mongo.ErrNoDocuments {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("mongo get cart: %w", err)
	}
	cart.Source = "mongodb"
	return &cart, nil
}

// UpsertCart inserts or updates a cart in MongoDB
func (r *cartMongoRepo) UpsertCart(ctx context.Context, cart *model.Cart) error {
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	now := time.Now()
	cart.SyncedAt = &now

	filter := bson.M{"user_id": cart.UserID}
	update := bson.M{
		"$set": bson.M{
			"user_id":        cart.UserID,
			"items":          cart.Items,
			"total_items":    cart.TotalItems,
			"total_price":    cart.TotalPrice,
			"updated_at":     cart.UpdatedAt,
			"synced_at":      now,
			"schema_version": cart.SchemaVersion,
			"source":         "mongodb",
		},
		"$setOnInsert": bson.M{
			"created_at": cart.CreatedAt,
		},
	}

	opts := options.Update().SetUpsert(true)
	_, err := r.collection.UpdateOne(ctx, filter, update, opts)
	if err != nil {
		return fmt.Errorf("mongo upsert cart: %w", err)
	}
	return nil
}

// DeleteCart removes a cart from MongoDB
func (r *cartMongoRepo) DeleteCart(ctx context.Context, userID string) error {
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	_, err := r.collection.DeleteOne(ctx, bson.M{"user_id": userID})
	if err != nil {
		return fmt.Errorf("mongo delete cart: %w", err)
	}
	return nil
}

// Ping checks MongoDB connectivity
func (r *cartMongoRepo) Ping(ctx context.Context) error {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	return r.collection.Database().Client().Ping(ctx, nil)
}
