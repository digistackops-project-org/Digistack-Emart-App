package api_test

import (
	"fmt"
	"os"
	"testing"

	"github.com/go-resty/resty/v2"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/suite"
)

// ============================================================
// API Tests - Run against a DEPLOYED instance
// Configure: API_BASE_URL=http://host:8081  JWT_TOKEN=<valid-token>
// Run: go test ./tests/api/... -v -tags=api
// ============================================================

type CartApiTestSuite struct {
	suite.Suite
	client  *resty.Client
	baseURL string
	token   string
}

func (s *CartApiTestSuite) SetupSuite() {
	s.baseURL = os.Getenv("API_BASE_URL")
	if s.baseURL == "" { s.baseURL = "http://localhost:8081" }
	s.token  = os.Getenv("JWT_TOKEN")
	if s.token == "" { s.T().Skip("JWT_TOKEN not set - skipping API tests") }
	s.client = resty.New().SetBaseURL(s.baseURL)
	fmt.Printf("API Tests running against: %s\n", s.baseURL)
}

func TestCartApiSuite(t *testing.T) { suite.Run(t, new(CartApiTestSuite)) }

// ---- Health Tests ----
func (s *CartApiTestSuite) TestH001_GetHealth_Returns200() {
	resp, err := s.client.R().Get("/health")
	s.NoError(err)
	s.Equal(200, resp.StatusCode())
	s.Contains(resp.String(), `"status":"UP"`)
}

func (s *CartApiTestSuite) TestH002_GetLiveness_Returns200() {
	resp, err := s.client.R().Get("/health/live")
	s.NoError(err)
	s.Equal(200, resp.StatusCode())
	s.Contains(resp.String(), `"probe":"liveness"`)
}

func (s *CartApiTestSuite) TestH003_GetReadiness_Returns200() {
	resp, err := s.client.R().Get("/health/ready")
	s.NoError(err)
	s.Equal(200, resp.StatusCode())
	s.Contains(resp.String(), `"probe":"readiness"`)
	s.Contains(resp.String(), `"redis":"UP"`)
	s.Contains(resp.String(), `"mongodb":"UP"`)
}

// ---- Auth Tests ----
func (s *CartApiTestSuite) TestS001_GetCart_WithoutToken_Returns401() {
	resp, err := s.client.R().Get("/api/v1/cart")
	s.NoError(err)
	s.Equal(401, resp.StatusCode())
}

// ---- Cart CRUD Tests ----
func (s *CartApiTestSuite) TestC001_GetCart_WithToken_Returns200() {
	resp, err := s.client.R().
		SetAuthToken(s.token).
		Get("/api/v1/cart")
	s.NoError(err)
	s.Equal(200, resp.StatusCode())
	s.Contains(resp.String(), `"success":true`)
}

func (s *CartApiTestSuite) TestC002_AddBookToCart_Returns200() {
	body := `{"product_id":"book-test-001","product_name":"The Go Programming Language","category":"books","price":39.99,"quantity":1}`
	resp, err := s.client.R().
		SetAuthToken(s.token).
		SetHeader("Content-Type", "application/json").
		SetBody(body).
		Post("/api/v1/cart/items")
	s.NoError(err)
	s.Equal(200, resp.StatusCode())
	s.Contains(resp.String(), `"success":true`)
	s.Contains(resp.String(), "book-test-001")
}

func (s *CartApiTestSuite) TestC003_AddCourseToCart_Returns200() {
	body := `{"product_id":"course-test-001","product_name":"React Mastery","category":"courses","price":79.99,"quantity":1}`
	resp, err := s.client.R().
		SetAuthToken(s.token).
		SetHeader("Content-Type", "application/json").
		SetBody(body).
		Post("/api/v1/cart/items")
	s.NoError(err)
	s.Equal(200, resp.StatusCode())
}

func (s *CartApiTestSuite) TestC004_AddSoftwareToCart_Returns200() {
	body := `{"product_id":"sw-test-001","product_name":"IntelliJ IDEA","category":"software","price":499.99,"quantity":1}`
	resp, err := s.client.R().
		SetAuthToken(s.token).
		SetHeader("Content-Type", "application/json").
		SetBody(body).
		Post("/api/v1/cart/items")
	s.NoError(err)
	s.Equal(200, resp.StatusCode())
}

func (s *CartApiTestSuite) TestC005_AddItem_InvalidCategory_Returns400() {
	body := `{"product_id":"p1","product_name":"Test","category":"INVALID","price":10.0,"quantity":1}`
	resp, err := s.client.R().
		SetAuthToken(s.token).
		SetHeader("Content-Type", "application/json").
		SetBody(body).
		Post("/api/v1/cart/items")
	s.NoError(err)
	s.Equal(400, resp.StatusCode())
}

func (s *CartApiTestSuite) TestC006_GetCartSummary_Returns200() {
	resp, err := s.client.R().
		SetAuthToken(s.token).
		Get("/api/v1/cart/summary")
	s.NoError(err)
	s.Equal(200, resp.StatusCode())
	s.Contains(resp.String(), `"total_items"`)
	s.Contains(resp.String(), `"total_price"`)
}

func (s *CartApiTestSuite) TestC007_ClearCart_Returns200() {
	resp, err := s.client.R().
		SetAuthToken(s.token).
		Delete("/api/v1/cart")
	s.NoError(err)
	s.Equal(200, resp.StatusCode())
	s.Contains(resp.String(), `"success":true`)
}
