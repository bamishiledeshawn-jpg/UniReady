package handlers

import (
	"context"
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/deshawn/uniready-api/internal/email"
	"github.com/deshawn/uniready-api/internal/otp"
	"github.com/deshawn/uniready-api/internal/phone"
	"github.com/deshawn/uniready-api/internal/session"
	"github.com/deshawn/uniready-api/internal/sms"
)

const (
	otpExpiry           = 5 * time.Minute
	otpResendCooldown   = 60 * time.Second // matches the frontend's resend-button cooldown
	otpDailyCapPerPhone = 5                // protects the SMS/email bill directly — the real financial risk here
	otpMaxAttempts      = 5                // caps brute-forcing a 6-digit code within its expiry window
	sessionTTL          = 30 * 24 * time.Hour
)

var emailPattern = regexp.MustCompile(`^[^\s@]+@[^\s@]+\.[^\s@]+$`)

type Auth struct {
	DB    *pgxpool.Pool
	SMS   sms.Sender
	Email email.Sender
}

func NewAuth(db *pgxpool.Pool, smsSender sms.Sender, emailSender email.Sender) *Auth {
	return &Auth{DB: db, SMS: smsSender, Email: emailSender}
}

// identifier is either a normalized phone number or a validated email —
// whichever one the request actually gave us. Every OTP-related handler
// works in terms of this instead of hardcoding "phone" throughout, since
// either can now be the verification channel.
type identifier struct {
	kind  string // "phone" | "email"
	value string
}

// resolveIdentifier picks the identifier to use: phone takes priority if
// both are given (matches how the field always behaved when it was the
// only option), otherwise falls back to email. Returns an error if
// neither is usable.
func resolveIdentifier(rawPhone, rawEmail string) (identifier, error) {
	if strings.TrimSpace(rawPhone) != "" {
		normalized, err := phone.Normalize(rawPhone)
		if err != nil {
			return identifier{}, err
		}
		return identifier{kind: "phone", value: normalized}, nil
	}
	trimmedEmail := strings.TrimSpace(rawEmail)
	if trimmedEmail != "" {
		if !emailPattern.MatchString(trimmedEmail) {
			return identifier{}, errInvalidEmail
		}
		return identifier{kind: "email", value: trimmedEmail}, nil
	}
	return identifier{}, errNoIdentifier
}

var (
	errInvalidEmail = &identifierError{"invalid_email", "Enter a valid email address"}
	errNoIdentifier = &identifierError{"missing_identifier", "Enter a phone number or an email address"}
)

type identifierError struct {
	code    string
	message string
}

func (e *identifierError) Error() string { return e.message }

type signupRequest struct {
	Name      string `json:"name" binding:"required"`
	Phone     string `json:"phone"`
	Email     string `json:"email"`
	PromoCode string `json:"promoCode"`
}

// Signup creates (or reuses, if unverified) a pending user row and sends
// an OTP via whichever channel the resolved identifier uses. Does not
// create a session — that only happens once the code is verified, via
// /otp/verify.
func (a *Auth) Signup(c *gin.Context) {
	var req signupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_request", "message": err.Error()})
		return
	}

	id, err := resolveIdentifier(req.Phone, req.Email)
	if err != nil {
		if idErr, ok := err.(*identifierError); ok {
			c.JSON(http.StatusBadRequest, gin.H{"error": idErr.code, "message": idErr.message})
			return
		}
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_phone", "message": "Enter a valid Nigerian phone number"})
		return
	}

	ctx := c.Request.Context()

	// A verified account already exists at this identifier — signup is
	// the wrong flow, point them at login instead.
	var existingVerified bool
	var lookupErr error
	if id.kind == "phone" {
		lookupErr = a.DB.QueryRow(ctx, `SELECT is_verified FROM users WHERE phone_number = $1`, id.value).Scan(&existingVerified)
	} else {
		lookupErr = a.DB.QueryRow(ctx, `SELECT is_verified FROM users WHERE email = $1`, id.value).Scan(&existingVerified)
	}
	if lookupErr == nil && existingVerified {
		c.JSON(http.StatusConflict, gin.H{
			"error":   "already_registered",
			"message": "An account already exists for this " + id.kind + " — try logging in instead.",
		})
		return
	}

	if limited, retryAfter := a.checkOTPRateLimit(ctx, id); limited {
		c.JSON(http.StatusTooManyRequests, gin.H{
			"error":      "rate_limited",
			"message":    "Too many code requests — try again shortly.",
			"retryAfter": retryAfter,
		})
		return
	}

	// A valid, active promo code sets attribution; an invalid one is
	// silently ignored rather than blocking signup.
	var promoCodeID *string
	promoCodeApplied := false
	if trimmed := strings.TrimSpace(strings.ToUpper(req.PromoCode)); trimmed != "" {
		var codeID string
		err := a.DB.QueryRow(ctx,
			`SELECT id FROM promo_codes WHERE code = $1 AND is_active = true`, trimmed,
		).Scan(&codeID)
		if err == nil {
			promoCodeID = &codeID
			promoCodeApplied = true
		}
	}

	// Upsert the pending user row. Which column is the conflict target
	// depends on which identifier we actually have — a NULL phone_number
	// can't be relied on for ON CONFLICT (Postgres treats NULLs as
	// distinct from each other), so this branches rather than using one
	// query for both cases.
	var phoneArg, emailArg *string
	if id.kind == "phone" {
		phoneArg = &id.value
		if req.Email != "" {
			e := strings.TrimSpace(req.Email)
			emailArg = &e
		}
	} else {
		emailArg = &id.value
	}

	if id.kind == "phone" {
		_, err = a.DB.Exec(ctx, `
			INSERT INTO users (phone_number, email, full_name, referred_by_promo_code_id, is_verified)
			VALUES ($1, $2, $3, $4, false)
			ON CONFLICT (phone_number) DO UPDATE
			SET full_name = EXCLUDED.full_name,
			    email = COALESCE(EXCLUDED.email, users.email),
			    referred_by_promo_code_id = COALESCE(users.referred_by_promo_code_id, EXCLUDED.referred_by_promo_code_id),
			    updated_at = now()
		`, phoneArg, emailArg, req.Name, promoCodeID)
	} else {
		_, err = a.DB.Exec(ctx, `
			INSERT INTO users (email, full_name, referred_by_promo_code_id, is_verified)
			VALUES ($1, $2, $3, false)
			ON CONFLICT (email) DO UPDATE
			SET full_name = EXCLUDED.full_name,
			    referred_by_promo_code_id = COALESCE(users.referred_by_promo_code_id, EXCLUDED.referred_by_promo_code_id),
			    updated_at = now()
		`, emailArg, req.Name, promoCodeID)
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "server_error", "message": "Could not create account"})
		return
	}

	if err := a.issueOTP(ctx, id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "server_error", "message": "Could not send verification code"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Verification code sent", "promoCodeApplied": promoCodeApplied})
}

type loginRequest struct {
	Phone string `json:"phone"`
	Email string `json:"email"`
}

// Login sends an OTP only if a verified account already exists at the
// given identifier. Never creates a user row — that's Signup's job.
func (a *Auth) Login(c *gin.Context) {
	var req loginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_request", "message": err.Error()})
		return
	}

	id, err := resolveIdentifier(req.Phone, req.Email)
	if err != nil {
		if idErr, ok := err.(*identifierError); ok {
			c.JSON(http.StatusBadRequest, gin.H{"error": idErr.code, "message": idErr.message})
			return
		}
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_phone", "message": "Enter a valid Nigerian phone number"})
		return
	}

	ctx := c.Request.Context()

	var isVerified bool
	var lookupErr error
	if id.kind == "phone" {
		lookupErr = a.DB.QueryRow(ctx, `SELECT is_verified FROM users WHERE phone_number = $1`, id.value).Scan(&isVerified)
	} else {
		lookupErr = a.DB.QueryRow(ctx, `SELECT is_verified FROM users WHERE email = $1`, id.value).Scan(&isVerified)
	}
	if lookupErr != nil || !isVerified {
		c.JSON(http.StatusNotFound, gin.H{
			"error":   "no_account",
			"message": "No account found for this " + id.kind + " — try signing up instead.",
		})
		return
	}

	if limited, retryAfter := a.checkOTPRateLimit(ctx, id); limited {
		c.JSON(http.StatusTooManyRequests, gin.H{
			"error":      "rate_limited",
			"message":    "Too many code requests — try again shortly.",
			"retryAfter": retryAfter,
		})
		return
	}

	if err := a.issueOTP(ctx, id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "server_error", "message": "Could not send verification code"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Verification code sent"})
}

type verifyRequest struct {
	Phone string `json:"phone"`
	Email string `json:"email"`
	Code  string `json:"code" binding:"required"`
}

// VerifyOTP checks the code against whichever identifier was used to
// request it, and — mode-agnostically — either marks a pending signup as
// verified or simply confirms an already-verified account for login.
func (a *Auth) VerifyOTP(c *gin.Context) {
	var req verifyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_request", "message": err.Error()})
		return
	}

	id, err := resolveIdentifier(req.Phone, req.Email)
	if err != nil {
		if idErr, ok := err.(*identifierError); ok {
			c.JSON(http.StatusBadRequest, gin.H{"error": idErr.code, "message": idErr.message})
			return
		}
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_phone", "message": "Enter a valid Nigerian phone number"})
		return
	}

	ctx := c.Request.Context()

	var otpID, codeHash string
	var attempts int
	if id.kind == "phone" {
		err = a.DB.QueryRow(ctx, `
			SELECT id, code_hash, attempts FROM otp_codes
			WHERE phone_number = $1 AND consumed_at IS NULL AND expires_at > now()
			ORDER BY created_at DESC LIMIT 1
		`, id.value).Scan(&otpID, &codeHash, &attempts)
	} else {
		err = a.DB.QueryRow(ctx, `
			SELECT id, code_hash, attempts FROM otp_codes
			WHERE email = $1 AND consumed_at IS NULL AND expires_at > now()
			ORDER BY created_at DESC LIMIT 1
		`, id.value).Scan(&otpID, &codeHash, &attempts)
	}
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "expired_or_missing",
			"message": "Code expired or not found — request a new one.",
		})
		return
	}

	if attempts >= otpMaxAttempts {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "too_many_attempts",
			"message": "Too many incorrect attempts — request a new code.",
		})
		return
	}

	if !otp.Verify(req.Code, codeHash) {
		a.DB.Exec(ctx, `UPDATE otp_codes SET attempts = attempts + 1 WHERE id = $1`, otpID)
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_code", "message": "Incorrect code"})
		return
	}

	a.DB.Exec(ctx, `UPDATE otp_codes SET consumed_at = now() WHERE id = $1`, otpID)

	var userID, name, userEmail string
	if id.kind == "phone" {
		err = a.DB.QueryRow(ctx, `
			UPDATE users SET is_verified = true, updated_at = now()
			WHERE phone_number = $1
			RETURNING id, COALESCE(full_name, ''), COALESCE(email, '')
		`, id.value).Scan(&userID, &name, &userEmail)
	} else {
		err = a.DB.QueryRow(ctx, `
			UPDATE users SET is_verified = true, updated_at = now()
			WHERE email = $1
			RETURNING id, COALESCE(full_name, ''), COALESCE(email, '')
		`, id.value).Scan(&userID, &name, &userEmail)
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "server_error", "message": "Could not verify account"})
		return
	}

	token, err := session.GenerateToken()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "server_error", "message": "Could not create session"})
		return
	}

	_, err = a.DB.Exec(ctx, `
		INSERT INTO sessions (user_id, token_hash, expires_at)
		VALUES ($1, $2, $3)
	`, userID, session.Hash(token), time.Now().Add(sessionTTL))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "server_error", "message": "Could not create session"})
		return
	}

	responsePhone := ""
	if id.kind == "phone" {
		responsePhone = id.value
	}
	c.JSON(http.StatusOK, gin.H{
		"token": token,
		"user": gin.H{
			"id":    userID,
			"name":  name,
			"phone": responsePhone,
			"email": userEmail,
		},
	})
}

// Google is a stub until real Google OAuth credentials exist — it returns
// a clear, honest "not configured" error rather than either faking
// success or not existing as a route at all.
func (a *Auth) Google(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{
		"error":   "not_configured",
		"message": "Google sign-in isn't configured on this server yet.",
	})
}

// checkOTPRateLimit enforces a cooldown and a daily cap, keyed on
// whichever identifier (phone or email) is actually being used — this is
// the direct fix for OTP-cost abuse regardless of which delivery channel
// is in play.
func (a *Auth) checkOTPRateLimit(ctx context.Context, id identifier) (limited bool, retryAfterSeconds int) {
	column := "phone_number"
	if id.kind == "email" {
		column = "email"
	}

	var lastCreatedAt time.Time
	err := a.DB.QueryRow(ctx, `
		SELECT created_at FROM otp_codes
		WHERE `+column+` = $1
		ORDER BY created_at DESC LIMIT 1
	`, id.value).Scan(&lastCreatedAt)
	if err == nil {
		elapsed := time.Since(lastCreatedAt)
		if elapsed < otpResendCooldown {
			return true, int((otpResendCooldown - elapsed).Seconds())
		}
	}

	var countLast24h int
	a.DB.QueryRow(ctx, `
		SELECT count(*) FROM otp_codes
		WHERE `+column+` = $1 AND created_at > now() - interval '24 hours'
	`, id.value).Scan(&countLast24h)
	if countLast24h >= otpDailyCapPerPhone {
		return true, 0
	}

	return false, 0
}

// issueOTP generates a code, stores its hash against the right column,
// and sends it via the right channel — SMS for phone, email otherwise.
func (a *Auth) issueOTP(ctx context.Context, id identifier) error {
	code, err := otp.Generate()
	if err != nil {
		return err
	}

	if id.kind == "phone" {
		_, err = a.DB.Exec(ctx, `
			INSERT INTO otp_codes (phone_number, code_hash, expires_at)
			VALUES ($1, $2, $3)
		`, id.value, otp.Hash(code), time.Now().Add(otpExpiry))
		if err != nil {
			return err
		}
		message := "Your UniReady verification code is " + code + ". It expires in 5 minutes."
		return a.SMS.Send(ctx, id.value, message)
	}

	_, err = a.DB.Exec(ctx, `
		INSERT INTO otp_codes (email, code_hash, expires_at)
		VALUES ($1, $2, $3)
	`, id.value, otp.Hash(code), time.Now().Add(otpExpiry))
	if err != nil {
		return err
	}
	body := "Your UniReady verification code is " + code + ". It expires in 5 minutes."
	return a.Email.Send(ctx, id.value, "Your UniReady verification code", body)
}