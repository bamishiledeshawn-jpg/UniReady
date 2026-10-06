package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

func RequirePremium(db *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.GetString("userID")

		var isPremium bool
		err := db.QueryRow(c.Request.Context(), `
			SELECT COALESCE(premium_until > now(), false) FROM users WHERE id = $1
		`, userID).Scan(&isPremium)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "server_error", "message": "Could not check your account"})
			c.Abort()
			return
		}

		if !isPremium {
			c.JSON(http.StatusForbidden, gin.H{"error": "premium_required", "message": "This is a premium feature"})
			c.Abort()
			return
		}

		c.Next()
	}
}