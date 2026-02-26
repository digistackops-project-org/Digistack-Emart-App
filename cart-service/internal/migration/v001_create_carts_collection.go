package migration

import (
	"context"
	"go.mongodb.org/mongo-driver/mongo"
)

// V001CreateCartsCollection creates the 'carts' collection in the 'cart' database
type V001CreateCartsCollection struct{}
func NewV001CreateCartsCollection() *V001CreateCartsCollection { return &V001CreateCartsCollection{} }
func (m *V001CreateCartsCollection) ID() string     { return "V001_CreateCartsCollection" }
func (m *V001CreateCartsCollection) Order() string  { return "001" }
func (m *V001CreateCartsCollection) Author() string { return "emart-db-team" }

func (m *V001CreateCartsCollection) Execute(ctx context.Context, db *mongo.Database) error {
	// Create carts collection
	names, _ := db.ListCollectionNames(ctx, map[string]interface{}{})
	exists := false
	for _, n := range names { if n == "carts" { exists = true; break } }
	if !exists {
		return db.CreateCollection(ctx, "carts")
	}
	return nil
}

func (m *V001CreateCartsCollection) Rollback(ctx context.Context, db *mongo.Database) error {
	return db.Collection("carts").Drop(ctx)
}
