package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/deshawn/uniready-api/internal/password"
	"github.com/deshawn/uniready-api/internal/session"
)

const adminSessionTTL = 12 * time.Hour // shorter than student sessions (30 days) — admin access to user/revenue data should re-authenticate more often

type AdminAuth struct {
	DB *pgxpool.Pool
}

func NewAdminAuth(db *pgxpool.Pool) *AdminAuth {
	return &AdminAuth{DB: db}
}

type adminLoginRequest struct {
	Email    string `json:"email" binding:"required"`
	Password string `json:"password" binding:"required"`
}

// Login is the only admin auth endpoint — there is deliberately no signup.
// Admin accounts are created out-of-band via the seedadmin CLI tool
// (cmd/seedadmin), never through an HTTP endpoint, so there's no attack
// surface for creating unauthorized admin accounts over the network.
func (a *AdminAuth) Login(c *gin.Context) {
	var req adminLoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_request", "message": err.Error()})
		return
	}

	ctx := c.Request.Context()

	var adminID, passwordHash, fullName string
	err := a.DB.QueryRow(ctx, `
		SELECT id, password_hash, full_name FROM admins WHERE email = $1
	`, req.Email).Scan(&adminID, &passwordHash, &fullName)
	if err != nil || !password.Verify(req.Password, passwordHash) {
		// Deliberately identical response whether the email doesn't exist
		// or the password is wrong — distinguishing the two would let
		// someone enumerate valid admin email addresses.
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid_credentials", "message": "Incorrect email or password"})
		return
	}

	token, err := session.GenerateToken()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "server_error", "message": "Could not create session"})
		return
	}

	_, err = a.DB.Exec(ctx, `
		INSERT INTO admin_sessions (admin_id, token_hash, expires_at)
		VALUES ($1, $2, $3)
	`, adminID, session.Hash(token), time.Now().Add(adminSessionTTL))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "server_error", "message": "Could not create session"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"token": token,
		"admin": gin.H{"id": adminID, "name": fullName, "email": req.Email},
	})
}

// Me returns the currently authenticated admin's info — used by the
// frontend to verify/restore a session on page load, and doubles as the
// simplest possible proof that RequireAdmin actually distinguishes admin
// sessions from student ones.
func (a *AdminAuth) Me(c *gin.Context) {
	adminID := c.GetString("adminID")
	ctx := c.Request.Context()

	var email, fullName string
	err := a.DB.QueryRow(ctx, `SELECT email, full_name FROM admins WHERE id = $1`, adminID).Scan(&email, &fullName)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not_found", "message": "Admin not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"admin": gin.H{"id": adminID, "name": fullName, "email": email}})
}