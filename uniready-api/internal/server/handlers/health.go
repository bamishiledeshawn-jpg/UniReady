package handlers

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Health wires the DB pool into the handler so /health can prove the whole
// stack is actually working, not just that the process is running. This
// matters for uptime monitoring and for catching DB connectivity issues
// (wrong credentials, network rules, provider outage) immediately instead
// of only when a real user request fails.
type Health struct {
	DB *pgxpool.Pool
}

func NewHealth(db *pgxpool.Pool) *Health {
	return &Health{DB: db}
}

func (h *Health) Check(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 2*time.Second)
	defer cancel()

	if err := h.DB.Ping(ctx); err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"status":   "unhealthy",
			"database": "unreachable",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":   "healthy",
		"database": "connected",
	})
}
