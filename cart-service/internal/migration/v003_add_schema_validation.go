package migration

import (
	"context"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

// V003AddSchemaValidation adds MongoDB JSON schema validation to the carts collection
type V003AddSchemaValidation struct{}
func NewV003AddSchemaValidation() *V003AddSchemaValidation { return &V003AddSchemaValidation{} }
func (m *V003AddSchemaValidation) ID() string     { return "V003_AddSchemaValidation" }
func (m *V003AddSchemaValidation) Order() string  { return "003" }
func (m *V003AddSchemaValidation) Author() string { return "emart-db-team" }

func (m *V003AddSchemaValidation) Execute(ctx context.Context, db *mongo.Database) error {
	jsonSchema := bson.M{
		"$jsonSchema": bson.M{
			"bsonType": "object",
			"required": []string{"user_id", "items", "total_items", "total_price"},
			"properties": bson.M{
				"user_id":    bson.M{"bsonType": "string", "description": "User ID from login service"},
				"items":      bson.M{"bsonType": "array", "description": "Array of cart items"},
				"total_items": bson.M{"bsonType": "int", "minimum": 0},
				"total_price": bson.M{"bsonType": "double", "minimum": 0},
				"schema_version": bson.M{"bsonType": "int", "minimum": 1},
			},
		},
	}

	cmd := bson.D{
		{Key: "collMod", Value: "carts"},
		{Key: "validator", Value: jsonSchema},
		{Key: "validationLevel", Value: "moderate"},
		{Key: "validationAction", Value: "error"},
	}

	return db.RunCommand(ctx, cmd).Err()
}

func (m *V003AddSchemaValidation) Rollback(ctx context.Context, db *mongo.Database) error {
	cmd := bson.D{
		{Key: "collMod", Value: "carts"},
		{Key: "validator", Value: bson.M{}},
		{Key: "validationLevel", Value: "off"},
	}
	return db.RunCommand(ctx, cmd).Err()
}
