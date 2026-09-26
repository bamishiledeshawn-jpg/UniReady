package handlers

import (
	"crypto/rand"
	"net/http"
	"regexp"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Promo struct {
	db *pgxpool.Pool
}

func NewPromo(db *pgxpool.Pool) *Promo {
	return &Promo{db: db}
}

// Excludes visually-confusing characters (0/O, 1/I/L) so a code is never
// misread when shared verbally or via a blurry screenshot.
const promoRandomAlphabet = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"

var nonLetterPattern = regexp.MustCompile(`[^A-Za-z]`)

// Defaults until the client finalizes real pricing — both are per-code,
// captured at generation time, not looked up live. This means changing
// these constants later only affects newly generated codes, never ones
// already handed out (matches how discount/commission percent are stored
// per-redemption too, in promo_redemptions).
const (
	defaultDiscountPercent   = 10.0
	defaultCommissionPercent = 5.0
	maxGenerationAttempts    = 10
)

func randomSuffix(length int) (string, error) {
	bytes := make([]byte, length)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	out := make([]byte, length)
	for i, b := range bytes {
		out[i] = promoRandomAlphabet[int(b)%len(promoRandomAlphabet)]
	}
	return string(out), nil
}

// namePrefix takes a user's full name and returns the first up-to-3
// letters, uppercased, with anything that isn't a letter stripped first
// (spaces, hyphens, apostrophes — "Mary-Jane" -> "MARY" -> "MAR").
// Falls back to "USR" if the name has no usable letters at all.
func namePrefix(fullName string) string {
	cleaned := strings.ToUpper(nonLetterPattern.ReplaceAllString(fullName, ""))
	if len(cleaned) == 0 {
		return "USR"
	}
	if len(cleaned) > 3 {
		return cleaned[:3]
	}
	return cleaned
}

// GenerateOwn creates a promo code for the logged-in user, tied to their
// account. One per account: if they already have an active code, this
// returns the existing one instead of creating a duplicate.
func (h *Promo) GenerateOwn(c *gin.Context) {
	userID := c.GetString("userID")
	ctx := c.Request.Context()

	var existingCode string
	err := h.db.QueryRow(ctx,
		`SELECT code FROM promo_codes WHERE owner_id = $1 AND is_active = true LIMIT 1`,
		userID,
	).Scan(&existingCode)
	if err == nil {
		c.JSON(http.StatusOK, gin.H{"code": existingCode, "alreadyExisted": true})
		return
	}
	if err != pgx.ErrNoRows {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "server_error", "message": "Could not check for an existing code"})
		return
	}

	var fullName string
	if err := h.db.QueryRow(ctx, `SELECT COALESCE(full_name, '') FROM users WHERE id = $1`, userID).Scan(&fullName); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "server_error", "message": "Could not load your account"})
		return
	}
	prefix := namePrefix(fullName)

	for attempt := 0; attempt < maxGenerationAttempts; attempt++ {
		suffix, err := randomSuffix(7 - len(prefix))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "server_error", "message": "Could not generate a code"})
			return
		}
		candidate := prefix + suffix

		var newCode string
		insertErr := h.db.QueryRow(ctx, `
			INSERT INTO promo_codes (code, owner_id, discount_percent, commission_percent)
			VALUES ($1, $2, $3, $4)
			ON CONFLICT (code) DO NOTHING
			RETURNING code
		`, candidate, userID, defaultDiscountPercent, defaultCommissionPercent).Scan(&newCode)

		if insertErr == nil {
			c.JSON(http.StatusOK, gin.H{"code": newCode, "alreadyExisted": false})
			return
		}
		if insertErr != pgx.ErrNoRows {
			// A real error, not just "the code collided" — stop retrying.
			c.JSON(http.StatusInternalServerError, gin.H{"error": "server_error", "message": "Could not save your code"})
			return
		}
		// pgx.ErrNoRows here means ON CONFLICT DO NOTHING fired — the
		// candidate collided with an existing code. Loop and try again
		// with a fresh random suffix.
	}

	c.JSON(http.StatusInternalServerError, gin.H{"error": "server_error", "message": "Could not generate a unique code — try again"})
}