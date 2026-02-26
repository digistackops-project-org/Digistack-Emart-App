package migration

import (
	"context"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// V002AddCartIndexes adds required indexes to the carts collection
type V002AddCartIndexes struct{}
func NewV002AddCartIndexes() *V002AddCartIndexes { return &V002AddCartIndexes{} }
func (m *V002AddCartIndexes) ID() string     { return "V002_AddCartIndexes" }
func (m *V002AddCartIndexes) Order() string  { return "002" }
func (m *V002AddCartIndexes) Author() string { return "emart-db-team" }

func (m *V002AddCartIndexes) Execute(ctx context.Context, db *mongo.Database) error {
	coll := db.Collection("carts")
	indexes := []mongo.IndexModel{
		// Unique index on user_id - one cart per user
		{
			Keys:    bson.D{{Key: "user_id", Value: 1}},
			Options: options.Index().SetUnique(true).SetName("idx_user_id_unique"),
		},
		// Index on updated_at for sync queries (find recently updated)
		{
			Keys:    bson.D{{Key: "updated_at", Value: -1}},
			Options: options.Index().SetName("idx_updated_at"),
		},
		// Index on synced_at for finding unsynced carts
		{
			Keys:    bson.D{{Key: "synced_at", Value: 1}},
			Options: options.Index().SetSparse(true).SetName("idx_synced_at"),
		},
		// Compound index: user_id + updated_at for efficient queries
		{
			Keys:    bson.D{{Key: "user_id", Value: 1}, {Key: "updated_at", Value: -1}},
			Options: options.Index().SetName("idx_user_updated"),
		},
	}

	_, err := coll.Indexes().CreateMany(ctx, indexes)
	return err
}

func (m *V002AddCartIndexes) Rollback(ctx context.Context, db *mongo.Database) error {
	coll := db.Collection("carts")
	for _, name := range []string{"idx_user_id_unique", "idx_updated_at", "idx_synced_at", "idx_user_updated"} {
		coll.Indexes().DropOne(ctx, name)
	}
	return nil
}
