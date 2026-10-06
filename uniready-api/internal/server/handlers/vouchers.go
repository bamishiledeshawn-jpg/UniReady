package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/deshawn/uniready-api/internal/otp"
)

type Vouchers struct {
	DB *pgxpool.Pool
}

func NewVouchers(db *pgxpool.Pool) *Vouchers {
	return &Vouchers{DB: db}
}

type redeemVoucherRequest struct {
	Code string `json:"code" binding:"required"`
}

// Redeem grants premium access for a valid, unused voucher and returns
// the redeeming batch's custom pop-up content, if an admin configured
// one for it — otherwise the frontend shows a generic success message.
// Requires RequireUser middleware to have set "userID" in context.
//
// Marking the voucher used and granting premium happen in a single
// database transaction — if either step fails, both roll back. Without
// this, a voucher could end up permanently marked "redeemed" while the
// user never actually received premium, with no way to recover except a
// manual database fix.
func (v *Vouchers) Redeem(c *gin.Context) {
	var req redeemVoucherRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_request", "message": err.Error()})
		return
	}

	userID := c.GetString("userID")
	ctx := c.Request.Context()

	tx, err := v.DB.Begin(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "server_error", "message": "Could not process redemption"})
		return
	}
	defer tx.Rollback(ctx) // no-op if Commit succeeds first

	// Vouchers are stored hashed, same principle as OTP codes — reusing
	// the otp package's hash function since it's the same SHA-256
	// hash-for-storage pattern, not otp-specific logic.
	codeHash := otp.Hash(NormalizeVoucherCode(req.Code))

	var voucherID string
	var batchID *string
	var premiumDays int
	err = tx.QueryRow(ctx, `
		SELECT id, batch_id, premium_days FROM vouchers
		WHERE code_hash = $1 AND redeemed_by IS NULL
		FOR UPDATE
	`, codeHash).Scan(&voucherID, &batchID, &premiumDays)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error":   "invalid_code",
			"message": "Voucher not found or already used",
		})
		return
	}

	// Mark it redeemed — this is what makes a voucher single-use. FOR
	// UPDATE above already locked this row, so a concurrent redemption
	// attempt on the same code blocks until this transaction finishes,
	// rather than racing.
	_, err = tx.Exec(ctx, `
		UPDATE vouchers SET redeemed_by = $1, redeemed_at = now()
		WHERE id = $2
	`, userID, voucherID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "server_error", "message": "Could not redeem voucher"})
		return
	}

	// Extend from whichever is later: now, or the user's existing
	// premium expiry — so redeeming a second voucher stacks additional
	// days on top of remaining premium time rather than overwriting it.
	var premiumUntil time.Time
	err = tx.QueryRow(ctx, `
		UPDATE users
		SET premium_until = GREATEST(now(), COALESCE(premium_until, now())) + make_interval(days => $1),
		    updated_at = now()
		WHERE id = $2
		RETURNING premium_until
	`, premiumDays, userID).Scan(&premiumUntil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "server_error", "message": "Could not grant premium access"})
		return
	}

	var popup gin.H
	if batchID != nil {
		var title, message, imageURL *string
		err := tx.QueryRow(ctx, `
			SELECT popup_title, popup_message, popup_image_url FROM voucher_batches WHERE id = $1
		`, *batchID).Scan(&title, &message, &imageURL)
		if err == nil && (title != nil || message != nil) {
			popup = gin.H{"title": title, "message": message, "imageUrl": imageURL}
		}
	}

	if err := tx.Commit(ctx); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "server_error", "message": "Could not complete redemption"})
		return
	}

	response := gin.H{
		"message":      "Voucher redeemed successfully",
		"premiumUntil": premiumUntil,
		"premiumDays":  premiumDays,
	}
	// A batch with no pop-up content configured just doesn't include a
	// "popup" key at all — the frontend shows its own generic success
	// state in that case rather than an empty/broken custom one.
	if popup != nil {
		response["popup"] = popup
	}

	c.JSON(http.StatusOK, response)
}