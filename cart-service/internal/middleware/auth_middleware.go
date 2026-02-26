package middleware

import (
	"net/http"
	"strings"

	"github.com/emart/cart-service/internal/model"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

// JWTAuthMiddleware validates the Bearer JWT token from the Login service
func JWTAuthMiddleware(jwtSecret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, model.ErrorResponse("Authorization header required"))
			return
		}

		tokenStr := strings.TrimPrefix(authHeader, "Bearer ")

		token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
			if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, jwt.ErrSignatureInvalid
			}
			return []byte(jwtSecret), nil
		})

		if err != nil || !token.Valid {
			c.AbortWithStatusJSON(http.StatusUnauthorized, model.ErrorResponse("Invalid or expired token"))
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			c.AbortWithStatusJSON(http.StatusUnauthorized, model.ErrorResponse("Invalid token claims"))
			return
		}

		// Extract user info from JWT claims (set by Login service)
		userID, _ := claims["userId"].(string)
		email, _ := claims["sub"].(string)
		name, _ := claims["name"].(string)

		// Set in context for handlers to use
		c.Set("user_id", userID)
		c.Set("email", email)
		c.Set("name", name)
		c.Next()
	}
}

// CORSMiddleware handles CORS for browser requests
func CORSMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Authorization,Content-Type,X-Requested-With")
		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		c.Next()
	}
}
