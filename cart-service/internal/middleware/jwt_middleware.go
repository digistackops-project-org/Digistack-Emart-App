package middleware

import (
	"net/http"
	"strings"

	"github.com/emart/cart-service/internal/model"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

const (
	UserIDKey    = "user_id"
	UserEmailKey = "user_email"
	UserRolesKey = "user_roles"
)

// JWTMiddleware validates JWT tokens issued by the Login Service
func JWTMiddleware(jwtSecret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, model.ErrorResponse(
				"Authorization header required", "missing_token"))
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, model.ErrorResponse(
				"Invalid Authorization header format", "invalid_token_format"))
			return
		}

		tokenStr := parts[1]
		token, err := jwt.Parse(tokenStr, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, jwt.ErrSignatureInvalid
			}
			return []byte(jwtSecret), nil
		})

		if err != nil || !token.Valid {
			c.AbortWithStatusJSON(http.StatusUnauthorized, model.ErrorResponse(
				"Invalid or expired token", "token_invalid"))
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			c.AbortWithStatusJSON(http.StatusUnauthorized, model.ErrorResponse(
				"Invalid token claims", "claims_invalid"))
			return
		}

		// Extract claims set by Login Service
		userID, _ := claims["userId"].(string)
		userEmail, _ := claims["sub"].(string)
		roles, _ := claims["roles"].([]interface{})

		if userID == "" || userEmail == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, model.ErrorResponse(
				"Token missing required claims", "claims_missing"))
			return
		}

		// Store in Gin context for handler use
		c.Set(UserIDKey, userID)
		c.Set(UserEmailKey, userEmail)
		c.Set(UserRolesKey, roles)

		c.Next()
	}
}

// GetUserID extracts the userID from the Gin context
func GetUserID(c *gin.Context) string {
	v, _ := c.Get(UserIDKey)
	id, _ := v.(string)
	return id
}

// GetUserEmail extracts the userEmail from the Gin context
func GetUserEmail(c *gin.Context) string {
	v, _ := c.Get(UserEmailKey)
	email, _ := v.(string)
	return email
}
