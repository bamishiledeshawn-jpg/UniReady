package handlers

import (
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/deshawn/uniready-api/internal/otp"
)

const (
	maxBatchQuantity    = 500
	maxBatchPremiumDays = 730
)

type AdminData struct {
	DB *pgxpool.Pool
}

func NewAdminData(db *pgxpool.Pool) *AdminData {
	return &AdminData{DB: db}
}

func (a *AdminData) Overview(c *gin.Context) {
	var totalUsers, newUsers7d, activePremium, revenueKobo int64
	var vouchersTotal, vouchersRedeemed, pendingCommissionKobo int64

	err := a.DB.QueryRow(c.Request.Context(), `
		SELECT
			(SELECT COUNT(*) FROM users),
			(SELECT COUNT(*) FROM users WHERE created_at >= now() - interval '7 days'),
			(SELECT COUNT(*) FROM users WHERE premium_until > now()),
			(SELECT COALESCE(SUM(amount_kobo), 0) FROM purchases WHERE status = 'success'),
			(SELECT COUNT(*) FROM vouchers),
			(SELECT COUNT(*) FROM vouchers WHERE redeemed_by IS NOT NULL),
			(SELECT COALESCE(SUM(commission_amount_kobo), 0) FROM promo_redemptions WHERE paid_out_at IS NULL)
	`).Scan(&totalUsers, &newUsers7d, &activePremium, &revenueKobo, &vouchersTotal, &vouchersRedeemed, &pendingCommissionKobo)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "server_error", "message": "Could not load overview"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"totalUsers":            totalUsers,
		"newUsers7d":            newUsers7d,
		"activePremiumUsers":    activePremium,
		"revenueKobo":           revenueKobo,
		"vouchersGenerated":     vouchersTotal,
		"vouchersRedeemed":      vouchersRedeemed,
		"pendingCommissionKobo": pendingCommissionKobo,
	})
}

func (a *AdminData) ListVoucherBatches(c *gin.Context) {
	rows, err := a.DB.Query(c.Request.Context(), `
		SELECT b.id, b.label, b.created_at,
		       (b.popup_title IS NOT NULL OR b.popup_message IS NOT NULL),
		       COUNT(v.id), COUNT(v.redeemed_by), MAX(v.premium_days)
		FROM voucher_batches b
		LEFT JOIN vouchers v ON v.batch_id = b.id
		GROUP BY b.id
		ORDER BY b.created_at DESC
		LIMIT 100
	`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "server_error", "message": "Could not load batches"})
		return
	}
	defer rows.Close()

	batches := []gin.H{}
	for rows.Next() {
		var id, label string
		var createdAt time.Time
		var hasPopup bool
		var total, redeemed int64
		var premiumDays *int
		if err := rows.Scan(&id, &label, &createdAt, &hasPopup, &total, &redeemed, &premiumDays); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "server_error", "message": "Could not load batches"})
			return
		}
		batches = append(batches, gin.H{
			"id":          id,
			"label":       label,
			"createdAt":   createdAt,
			"hasPopup":    hasPopup,
			"total":       total,
			"redeemed":    redeemed,
			"premiumDays": premiumDays,
		})
	}
	if err := rows.Err(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "server_error", "message": "Could not load batches"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"batches": batches})
}

type createBatchRequest struct {
	Label         string  `json:"label" binding:"required"`
	PremiumDays   int     `json:"premiumDays" binding:"required"`
	Quantity      int     `json:"quantity" binding:"required"`
	PopupTitle    *string `json:"popupTitle"`
	PopupMessage  *string `json:"popupMessage"`
	PopupImageURL *string `json:"popupImageUrl"`
}

func cleanOptional(p *string, maxLen int) (*string, bool) {
	if p == nil {
		return nil, true
	}
	s := strings.TrimSpace(*p)
	if s == "" {
		return nil, true
	}
	if len(s) > maxLen {
		return nil, false
	}
	return &s, true
}

// CreateVoucherBatch creates a batch and its vouchers in one transaction and
// returns the plaintext codes in this response only. Only SHA-256 hashes are
// stored, so the codes cannot be shown again afterwards.
func (a *AdminData) CreateVoucherBatch(c *gin.Context) {
	var req createBatchRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_request", "message": "Label, premium days and quantity are required"})
		return
	}

	label := strings.TrimSpace(req.Label)
	if label == "" || len(label) > 120 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_request", "message": "Label must be 1-120 characters"})
		return
	}
	if req.PremiumDays < 1 || req.PremiumDays > maxBatchPremiumDays {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_request", "message": "Premium days must be between 1 and 730"})
		return
	}
	if req.Quantity < 1 || req.Quantity > maxBatchQuantity {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_request", "message": "Quantity must be between 1 and 500"})
		return
	}

	title, ok1 := cleanOptional(req.PopupTitle, 120)
	message, ok2 := cleanOptional(req.PopupMessage, 500)
	imageURL, ok3 := cleanOptional(req.PopupImageURL, 500)
	if !ok1 || !ok2 || !ok3 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_request", "message": "Pop-up title, message or image link is too long"})
		return
	}
	if imageURL != nil && !strings.HasPrefix(*imageURL, "https://") && !strings.HasPrefix(*imageURL, "http://") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_request", "message": "Pop-up image link must start with http:// or https://"})
		return
	}

	codes := make([]string, 0, req.Quantity)
	seen := make(map[string]struct{}, req.Quantity)
	for len(codes) < req.Quantity {
		code, err := generateVoucherCode()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "server_error", "message": "Could not generate codes"})
			return
		}
		if _, dup := seen[code]; dup {
			continue
		}
		seen[code] = struct{}{}
		codes = append(codes, code)
	}

	hashes := make([]string, len(codes))
	display := make([]string, len(codes))
	for i, code := range codes {
		hashes[i] = otp.Hash(code)
		display[i] = formatVoucherCode(code)
	}

	ctx := c.Request.Context()
	adminID := c.GetString("adminID")

	tx, err := a.DB.Begin(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "server_error", "message": "Could not create batch"})
		return
	}
	defer tx.Rollback(ctx)

	var batchID string
	err = tx.QueryRow(ctx, `
		INSERT INTO voucher_batches (label, popup_title, popup_message, popup_image_url, created_by)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id
	`, label, title, message, imageURL, adminID).Scan(&batchID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "server_error", "message": "Could not create batch"})
		return
	}

	_, err = tx.Exec(ctx, `
		INSERT INTO vouchers (code_hash, batch_id, premium_days)
		SELECT unnest($1::text[]), $2::uuid, $3::int
	`, hashes, batchID, req.PremiumDays)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "server_error", "message": "Could not save vouchers, please try again"})
		return
	}

	if err := tx.Commit(ctx); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "server_error", "message": "Could not save vouchers, please try again"})
		return
	}

	c.Header("Cache-Control", "no-store")
	c.JSON(http.StatusCreated, gin.H{
		"batch": gin.H{
			"id":          batchID,
			"label":       label,
			"premiumDays": req.PremiumDays,
			"quantity":    len(codes),
		},
		"codes": display,
	})
}