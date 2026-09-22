package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Users handles endpoints about the logged-in user's own profile —
// currently just the onboarding exam-type choice. Deliberately separate
// from auth.go (signup/login/OTP) since this is post-login profile data,
// not authentication.
type Users struct {
	db *pgxpool.Pool
}

func NewUsers(db *pgxpool.Pool) *Users {
	return &Users{db: db}
}

var validExamTypes = map[string]bool{
	"JAMB": true,
	"WAEC": true,
	"NECO": true,
}

type updateExamTypeRequest struct {
	ExamType string `json:"examType"`
}

// UpdateExamType saves which exam the logged-in user is preparing for,
// captured during onboarding. RequireUser middleware guarantees "userID"
// is set in the context before this handler runs.
func (h *Users) UpdateExamType(c *gin.Context) {
	var req updateExamTypeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_request", "message": "Could not read request body"})
		return
	}

	if !validExamTypes[req.ExamType] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_exam_type", "message": "examType must be one of JAMB, WAEC, NECO"})
		return
	}

	userID := c.GetString("userID")

	_, err := h.db.Exec(c.Request.Context(), `
		UPDATE users SET exam_type = $1, updated_at = now() WHERE id = $2
	`, req.ExamType, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "server_error", "message": "Could not save exam type"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"examType": req.ExamType})
}