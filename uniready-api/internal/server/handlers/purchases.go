package handlers

import (
	"bytes"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha512"
	"encoding/hex"
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Purchases struct {
	db                *pgxpool.Pool
	paystackSecretKey string
	paystackPublicKey string
}

func NewPurchases(db *pgxpool.Pool, paystackSecretKey, paystackPublicKey string) *Purchases {
	return &Purchases{db: db, paystackSecretKey: paystackSecretKey, paystackPublicKey: paystackPublicKey}
}

// PLACEHOLDER pricing, per client direction: full price ₦5,000, promo
// price ₦3,000, promo code owner earns ₦1,000 of that. Changing these
// only affects purchases initialized after the change — anything
// already in flight keeps whatever was set at initialization time.
const (
	premiumPriceKobo    = 500000 // ₦5,000 full price
	premiumDurationDays = 182    // ~6 months
)

type initializeRequest struct {
	PromoCode string `json:"promoCode"`
}

// Initialize computes the real price (applying a promo code's discount
// if one was given and is valid), creates a pending purchase row, and
// returns everything the frontend needs to open the Paystack Popup
// itself — this handler never talks to Paystack's API directly. Popup
// mode means the frontend does that part; this just prepares the
// reference/amount pair and remembers which promo code (if any) was
// intended, for when the webhook confirms payment later.
func (h *Purchases) Initialize(c *gin.Context) {
	userID := c.GetString("userID")
	ctx := c.Request.Context()

	var req initializeRequest
	_ = c.ShouldBindJSON(&req) // promoCode is optional — an empty/missing body is fine

	var userEmail string
	if err := h.db.QueryRow(ctx, `SELECT COALESCE(email, '') FROM users WHERE id = $1`, userID).Scan(&userEmail); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "server_error", "message": "Could not load your account"})
		return
	}
	if userEmail == "" {
		// Paystack Popup needs an email to charge against — a
		// phone-only account can't check out until they add one.
		// Surfacing this clearly beats a confusing Paystack-side error.
		c.JSON(http.StatusBadRequest, gin.H{"error": "email_required", "message": "Add an email to your account before purchasing premium"})
		return
	}

	finalAmountKobo := premiumPriceKobo
	var promoCodeID *string

	if trimmed := strings.ToUpper(strings.TrimSpace(req.PromoCode)); trimmed != "" {
		var codeID, ownerID string
		var discountPercent float64
		err := h.db.QueryRow(ctx,
			`SELECT id, owner_id, discount_percent FROM promo_codes WHERE code = $1 AND is_active = true`, trimmed,
		).Scan(&codeID, &ownerID, &discountPercent)

		// A user's own code is treated exactly like an invalid one —
		// silently ignored, full price applies, no distinct error. This
		// still fully closes the self-dealing loophole (no discount, no
		// commission ever gets created for it) without needing special
		// UI messaging — per client direction, it should just read as
		// "that code didn't work" like any other bad code would.
		if err == nil && ownerID != userID {
			finalAmountKobo = int(float64(premiumPriceKobo) * (1 - discountPercent/100))
			promoCodeID = &codeID
		}
		// An invalid/inactive code is silently ignored here too, same
		// pattern as signup-time promo handling in auth.go — full price
		// applies rather than blocking checkout over a bad code.
	}

	reference, err := generatePaymentReference()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "server_error", "message": "Could not start checkout"})
		return
	}

	_, err = h.db.Exec(ctx, `
		INSERT INTO purchases (id, user_id, amount_kobo, status, payment_reference, promo_code_id)
		VALUES (gen_random_uuid(), $1, $2, 'pending', $3, $4)
	`, userID, finalAmountKobo, reference, promoCodeID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "server_error", "message": "Could not start checkout"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"reference":  reference,
		"amountKobo": finalAmountKobo,
		"email":      userEmail,
		"publicKey":  h.paystackPublicKey,
	})
}

// Status lets the frontend check whether a purchase has been confirmed
// yet — the webhook is what actually flips this to "success" (source of
// truth), this endpoint just reads whatever the database currently says,
// so the frontend can poll it a few times after the Popup's own success
// callback fires, rather than trusting the client-side callback alone.
func (h *Purchases) Status(c *gin.Context) {
	userID := c.GetString("userID")
	reference := c.Param("reference")

	var status string
	err := h.db.QueryRow(c.Request.Context(),
		`SELECT status FROM purchases WHERE payment_reference = $1 AND user_id = $2`,
		reference, userID,
	).Scan(&status)
	if err == pgx.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "not_found", "message": "No purchase found for that reference"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "server_error", "message": "Could not check purchase status"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": status})
}

type paystackWebhookPayload struct {
	Event string `json:"event"`
	Data  struct {
		Reference string `json:"reference"`
		Amount    int    `json:"amount"`
		Currency  string `json:"currency"`
		Status    string `json:"status"`
	} `json:"data"`
}

// Webhook is the actual source of truth for "did this payment really
// happen" — never the frontend's success callback alone, which could be
// interrupted, replayed, or spoofed. Paystack signs every webhook
// request with your secret key; verifying that signature is what makes
// this endpoint trustworthy. Skipping this check would mean anyone who
// discovers this URL could POST a fake "payment succeeded" body and
// grant themselves free premium.
func (h *Purchases) Webhook(c *gin.Context) {
	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		c.Status(http.StatusBadRequest)
		return
	}

	signature := c.GetHeader("X-Paystack-Signature")
	mac := hmac.New(sha512.New, []byte(h.paystackSecretKey))
	mac.Write(body)
	expected := hex.EncodeToString(mac.Sum(nil))
	if !hmac.Equal([]byte(signature), []byte(expected)) {
		// Deliberately vague response — don't tell an attacker WHY
		// their forged request failed.
		c.Status(http.StatusUnauthorized)
		return
	}

	var payload paystackWebhookPayload
	if err := json.NewDecoder(bytes.NewReader(body)).Decode(&payload); err != nil {
		c.Status(http.StatusBadRequest)
		return
	}

	if payload.Event != "charge.success" || payload.Data.Status != "success" {
		// Covers both other event types (failed charges, disputes) and
		// a "charge.success" event whose own data.status somehow isn't
		// "success" — belt and suspenders, since the event name alone
		// is not a field we'd want to trust blindly. Still respond 200
		// either way so Paystack doesn't keep retrying delivery.
		c.Status(http.StatusOK)
		return
	}

	ctx := c.Request.Context()

	var purchaseID, userID string
	var amountKobo int
	var status string
	var promoCodeID *string
	err = h.db.QueryRow(ctx, `
		SELECT id, user_id, amount_kobo, status, promo_code_id
		FROM purchases WHERE payment_reference = $1
	`, payload.Data.Reference).Scan(&purchaseID, &userID, &amountKobo, &status, &promoCodeID)
	if err != nil {
		// Unknown reference — nothing we initiated. Acknowledge anyway
		// so Paystack stops retrying; there's nothing more to do here.
		c.Status(http.StatusOK)
		return
	}

	if status != "pending" {
		// Already processed — Paystack can and does send the same
		// webhook more than once. Acknowledging without reprocessing is
		// what makes this safe to receive twice.
		c.Status(http.StatusOK)
		return
	}

	if payload.Data.Amount != amountKobo || payload.Data.Currency != "NGN" {
		// The amount or currency Paystack confirms doesn't match what
		// we expected for this reference — do not grant anything. Leave
		// status as pending rather than guessing; this needs a human
		// to look at it, not an automatic grant.
		c.Status(http.StatusOK)
		return
	}

	tx, err := h.db.Begin(ctx)
	if err != nil {
		c.Status(http.StatusInternalServerError)
		return
	}
	defer tx.Rollback(ctx) // no-op if Commit succeeds first

	// The UPDATE itself is the concurrency guard — not the SELECT above.
	// Paystack retries webhook delivery, so two deliveries for the same
	// event can arrive close together. Both could pass the "pending"
	// check above before either one's UPDATE commits, which would
	// double-grant premium and double-insert a commission row. Making
	// the WHERE clause re-check status='pending', and confirming exactly
	// one row changed, closes that gap: whichever request's UPDATE
	// commits first "wins" the row, and the other sees zero rows
	// affected and stops here instead of proceeding.
	tag, err := tx.Exec(ctx, `UPDATE purchases SET status = 'success' WHERE id = $1 AND status = 'pending'`, purchaseID)
	if err != nil {
		c.Status(http.StatusInternalServerError)
		return
	}
	if tag.RowsAffected() == 0 {
		// Lost the race to another delivery of the same webhook — it's
		// already been processed, nothing left to do. Not an error.
		c.Status(http.StatusOK)
		return
	}

	// Stack onto existing premium time if they still have some left,
	// rather than always counting from today — someone who buys again
	// before their current period expires shouldn't lose the remainder.
	if _, err := tx.Exec(ctx, `
		UPDATE users
		SET premium_until = GREATEST(COALESCE(premium_until, now()), now()) + ($1 || ' days')::interval
		WHERE id = $2
	`, premiumDurationDays, userID); err != nil {
		c.Status(http.StatusInternalServerError)
		return
	}

	if promoCodeID != nil {
		var discountPercent, commissionPercent float64
		if err := tx.QueryRow(ctx,
			`SELECT discount_percent, commission_percent FROM promo_codes WHERE id = $1`, *promoCodeID,
		).Scan(&discountPercent, &commissionPercent); err == nil {
			// Note: 33.33% of ₦3,000 is ₦999.90, not an exact ₦1,000 —
			// a side effect of storing the rate to 2 decimal places
			// rather than the repeating 33.333...%. A few kobo off is
			// immaterial for a placeholder rate; revisit if the client
			// wants an exact whole-naira commission at real launch.
			commissionKobo := int(float64(amountKobo) * commissionPercent / 100)
			if _, err := tx.Exec(ctx, `
				INSERT INTO promo_redemptions (promo_code_id, purchase_id, discount_percent_applied, commission_percent_applied, commission_amount_kobo)
				VALUES ($1, $2, $3, $4, $5)
			`, *promoCodeID, purchaseID, discountPercent, commissionPercent, commissionKobo); err != nil {
				c.Status(http.StatusInternalServerError)
				return
			}
		}
	}

	if err := tx.Commit(ctx); err != nil {
		c.Status(http.StatusInternalServerError)
		return
	}

	c.Status(http.StatusOK)
}

func generatePaymentReference() (string, error) {
	bytes := make([]byte, 12)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return "uniready_" + hex.EncodeToString(bytes) + "_" + time.Now().Format("20060102150405"), nil
}