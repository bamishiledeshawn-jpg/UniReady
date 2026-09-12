package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/deshawn/uniready-api/internal/session"
)

// RequireUser reads the Authorization: Bearer <token> header, checks it
// against the sessions table, and — on success — sets "userID" in the
// gin context for downstream handlers. Rejects with 401 if the header is
// missing, malformed, or the token doesn't match a live, unexpired
// session. This is what lets an endpoint know WHO is making the request,
// not just that some request arrived.
func RequireUser(db *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		token, ok := strings.CutPrefix(header, "Bearer ")
		if !ok || token == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized", "message": "Missing or malformed Authorization header"})
			c.Abort()
			return
		}

		var userID string
		err := db.QueryRow(c.Request.Context(), `
			SELECT user_id FROM sessions
			WHERE token_hash = $1 AND expires_at > now()
		`, session.Hash(token)).Scan(&userID)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized", "message": "Invalid or expired session"})
			c.Abort()
			return
		}

		c.Set("userID", userID)
		c.Next()
	}
}

// RequireAdmin is the admin equivalent of RequireUser — deliberately a
// separate function, not a parameterized version of one middleware,
// because student sessions and admin sessions are different tables with
// different trust levels. Conflating them, even to save a few lines,
// would make it too easy for a future change to accidentally accept a
// student token where an admin token is required.
func RequireAdmin(db *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		token, ok := strings.CutPrefix(header, "Bearer ")
		if !ok || token == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized", "message": "Missing or malformed Authorization header"})
			c.Abort()
			return
		}

		var adminID string
		err := db.QueryRow(c.Request.Context(), `
			SELECT admin_id FROM admin_sessions
			WHERE token_hash = $1 AND expires_at > now()
		`, session.Hash(token)).Scan(&adminID)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized", "message": "Invalid or expired admin session"})
			c.Abort()
			return
		}

		c.Set("adminID", adminID)
		c.Next()
	}
}