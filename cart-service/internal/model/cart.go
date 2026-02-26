package model

import "time"

// CartItem represents a single product in the cart
type CartItem struct {
	ItemID      string    `json:"item_id"      bson:"item_id"`
	ProductID   string    `json:"product_id"   bson:"product_id"`
	ProductName string    `json:"product_name" bson:"product_name"`
	Category    string    `json:"category"     bson:"category"`
	Price       float64   `json:"price"        bson:"price"`
	Quantity    int       `json:"quantity"     bson:"quantity"`
	ImageURL    string    `json:"image_url"    bson:"image_url"`
	AddedAt     time.Time `json:"added_at"     bson:"added_at"`
}

// Cart is the full cart for a user
type Cart struct {
	ID            string     `json:"id"             bson:"_id,omitempty"`
	UserID        string     `json:"user_id"        bson:"user_id"`
	Items         []CartItem `json:"items"          bson:"items"`
	TotalItems    int        `json:"total_items"    bson:"total_items"`
	TotalPrice    float64    `json:"total_price"    bson:"total_price"`
	CreatedAt     time.Time  `json:"created_at"     bson:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"     bson:"updated_at"`
	SyncedAt      *time.Time `json:"synced_at"      bson:"synced_at"`
	Source        string     `json:"source"         bson:"source"`
	SchemaVersion int        `json:"schema_version" bson:"schema_version"`
}

// AddItemRequest DTO
type AddItemRequest struct {
	ProductID   string  `json:"product_id"   binding:"required"`
	ProductName string  `json:"product_name" binding:"required"`
	Category    string  `json:"category"     binding:"required,oneof=books courses software"`
	Price       float64 `json:"price"        binding:"required,gt=0"`
	Quantity    int     `json:"quantity"     binding:"required,min=1,max=100"`
	ImageURL    string  `json:"image_url"`
}

// UpdateQuantityRequest DTO
type UpdateQuantityRequest struct {
	Quantity int `json:"quantity" binding:"required,min=0,max=100"`
}

// CartSummary lightweight for header
type CartSummary struct {
	UserID     string  `json:"user_id"`
	TotalItems int     `json:"total_items"`
	TotalPrice float64 `json:"total_price"`
}

// ApiResponse standard wrapper
type ApiResponse struct {
	Success   bool        `json:"success"`
	Message   string      `json:"message"`
	Data      interface{} `json:"data,omitempty"`
	Timestamp time.Time   `json:"timestamp"`
}

func SuccessResponse(data interface{}, message string) ApiResponse {
	return ApiResponse{Success: true, Message: message, Data: data, Timestamp: time.Now()}
}
func ErrorResponse(message string) ApiResponse {
	return ApiResponse{Success: false, Message: message, Timestamp: time.Now()}
}

// HealthStatus for health endpoints
type HealthStatus struct {
	Status    string            `json:"status"`
	Service   string            `json:"service"`
	Version   string            `json:"version"`
	Timestamp time.Time         `json:"timestamp"`
	Checks    map[string]string `json:"checks,omitempty"`
	Probe     string            `json:"probe,omitempty"`
	Message   string            `json:"message,omitempty"`
}

// MigrationRecord mirrors Mongock changeLog in MongoDB
type MigrationRecord struct {
	ID         string    `bson:"_id"`
	ChangeID   string    `bson:"changeId"`
	Author     string    `bson:"author"`
	State      string    `bson:"state"`
	ExecutedAt time.Time `bson:"executedAt"`
	Order      string    `bson:"order"`
}
