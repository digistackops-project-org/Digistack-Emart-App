package handler

import (
	"context"
	"net/http"
	"time"

	"github.com/emart/cart-service/internal/model"
	mongorepo "github.com/emart/cart-service/internal/repository/mongo"
	redisrepo "github.com/emart/cart-service/internal/repository/redis"
	"github.com/gin-gonic/gin"
)

type HealthHandler struct {
	redisRepo redisrepo.CartRedisRepository
	mongoRepo mongorepo.CartMongoRepository
	appName   string
	version   string
}

func NewHealthHandler(
	redisRepo redisrepo.CartRedisRepository,
	mongoRepo mongorepo.CartMongoRepository,
	appName, version string,
) *HealthHandler {
	return &HealthHandler{
		redisRepo: redisRepo,
		mongoRepo: mongoRepo,
		appName:   appName,
		version:   version,
	}
}

func (h *HealthHandler) RegisterRoutes(router gin.IRouter) {
	router.GET("/health",       h.Health)
	router.GET("/health/live",  h.Liveness)
	router.GET("/health/ready", h.Readiness)
}

// Health - GET /health
// General health check. Used by load balancer.
func (h *HealthHandler) Health(c *gin.Context) {
	c.JSON(http.StatusOK, model.HealthStatus{
		Status:    "UP",
		Service:   h.appName,
		Version:   h.version,
		Timestamp: time.Now(),
	})
}

// Liveness - GET /health/live
// K8s Liveness Probe: is the process alive?
func (h *HealthHandler) Liveness(c *gin.Context) {
	c.JSON(http.StatusOK, model.HealthStatus{
		Status:    "UP",
		Service:   h.appName,
		Version:   h.version,
		Timestamp: time.Now(),
		Probe:     "liveness",
		Message:   "Application process is alive",
	})
}

// Readiness - GET /health/ready
// K8s Readiness Probe: is the app ready to serve traffic?
// Checks: Redis + MongoDB
func (h *HealthHandler) Readiness(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	checks := map[string]string{}
	allHealthy := true

	// Check Redis
	if err := h.redisRepo.Ping(ctx); err != nil {
		checks["redis"] = "DOWN - " + err.Error()
		allHealthy = false
	} else {
		checks["redis"] = "UP"
	}

	// Check MongoDB
	if err := h.mongoRepo.Ping(ctx); err != nil {
		checks["mongodb"] = "DOWN - " + err.Error()
		allHealthy = false
	} else {
		checks["mongodb"] = "UP"
	}

	status := model.HealthStatus{
		Service:   h.appName,
		Version:   h.version,
		Timestamp: time.Now(),
		Checks:    checks,
		Probe:     "readiness",
	}

	if allHealthy {
		status.Status = "UP"
		status.Message = "Application is ready to serve traffic"
		c.JSON(http.StatusOK, status)
	} else {
		status.Status = "DOWN"
		status.Message = "Application is NOT ready - dependencies unavailable"
		c.JSON(http.StatusServiceUnavailable, status)
	}
}
