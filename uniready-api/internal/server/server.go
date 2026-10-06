package server

import (
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/deshawn/uniready-api/internal/config"
	"github.com/deshawn/uniready-api/internal/email"
	"github.com/deshawn/uniready-api/internal/middleware"
	"github.com/deshawn/uniready-api/internal/server/handlers"
	"github.com/deshawn/uniready-api/internal/sms"
)

// New builds the fully-wired Gin engine: middleware, handlers, and routes.
// Keeping this assembly in one place makes it obvious what the API surface
// actually is without hunting through multiple files.
func New(cfg config.Config, db *pgxpool.Pool) *gin.Engine {
	if cfg.IsProduction() {
		gin.SetMode(gin.ReleaseMode)
	}

	router := gin.New()
	router.Use(gin.Recovery()) // never let a panic in one request crash the whole server
	router.Use(gin.Logger())

	router.Use(cors.New(cors.Config{
		// TODO: tighten this to your actual frontend origin(s) before
		// production — wide open is fine for local dev only.
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		AllowCredentials: false,
		MaxAge:           12 * time.Hour,
	}))

	// Shared rate limiter for sensitive endpoints (auth/OTP). Applied
	// per-route below, not globally — general read endpoints (question
	// bank, dashboard data) don't need the same restriction. This is an
	// IP-based limiter and is separate from the per-phone cooldown/daily
	// cap enforced inside the auth handlers themselves — the two guard
	// against different attack shapes (one attacker hammering fast vs.
	// one attacker rotating through many numbers).
	authLimiter := middleware.NewRateLimiter(5, time.Minute)

	// ConsoleSender logs OTP codes to the server console instead of
	// sending real SMS — swap for a real Termii/Africa's Talking client
	// once that provider account exists (see PROJECT_STATUS.md).
	smsSender := sms.NewConsoleSender()
	// Same idea for email OTP — logs instead of sending, until a real
	// provider (Postmark, SendGrid, Resend, etc.) is wired up.
	emailSender := email.NewConsoleSender()

	healthHandler := handlers.NewHealth(db)
	authHandler := handlers.NewAuth(db, smsSender, emailSender)
	vouchersHandler := handlers.NewVouchers(db)
	adminAuthHandler := handlers.NewAdminAuth(db)
	adminDataHandler := handlers.NewAdminData(db)
	usersHandler := handlers.NewUsers(db)
	promoHandler := handlers.NewPromo(db)
	purchasesHandler := handlers.NewPurchases(db, cfg.PaystackSecretKey, cfg.PaystackPublicKey)

	router.GET("/health", healthHandler.Check)

	api := router.Group("/api/v1")
	{
		auth := api.Group("/auth")
		auth.Use(authLimiter.Middleware())
		{
			auth.POST("/signup", authHandler.Signup)
			auth.POST("/login", authHandler.Login)
			auth.POST("/otp/verify", authHandler.VerifyOTP)
			auth.POST("/google", authHandler.Google)
		}

		vouchers := api.Group("/vouchers")
		vouchers.Use(middleware.RequireUser(db))
		{
			vouchers.POST("/redeem", vouchersHandler.Redeem)
		}

		users := api.Group("/users")
		users.Use(middleware.RequireUser(db))
		{
			users.GET("/me", usersHandler.GetMe)
			users.PATCH("/me/exam-type", usersHandler.UpdateExamType)
		}

		promo := api.Group("/promo-codes")
		promo.Use(middleware.RequireUser(db))
		{
			promo.POST("/me", promoHandler.GenerateOwn)
			promo.GET("/me", promoHandler.GetOwn)
		}

		purchases := api.Group("/purchases")
		purchases.Use(middleware.RequireUser(db))
		{
			purchases.POST("/initialize", purchasesHandler.Initialize)
			purchases.GET("/:reference/status", purchasesHandler.Status)
		}

		// Paystack calls this directly — it is NOT a logged-in user, so
		// it deliberately sits outside RequireUser. Trust here comes
		// from the signature check inside the handler itself, not from
		// session middleware.
		api.POST("/webhooks/paystack", purchasesHandler.Webhook)

		// Separate rate limiter instance from authLimiter — admin login
		// attempts shouldn't share a budget with student OTP requests,
		// they're different endpoints with different abuse shapes.
		adminLimiter := middleware.NewRateLimiter(5, time.Minute)
		admin := api.Group("/admin")
		admin.Use(adminLimiter.Middleware())
		{
			admin.POST("/login", adminAuthHandler.Login)
		}

		adminProtected := api.Group("/admin")
		adminProtected.Use(middleware.RequireAdmin(db))
		{
			adminProtected.GET("/me", adminAuthHandler.Me)
			adminProtected.GET("/stats/overview", adminDataHandler.Overview)
			adminProtected.GET("/voucher-batches", adminDataHandler.ListVoucherBatches)
			adminProtected.POST("/voucher-batches", adminDataHandler.CreateVoucherBatch)
		}

		// Add further route groups here as they're built, e.g.:
		// questions := api.Group("/questions")
		// practice := api.Group("/practice")
		//
		// Admin-only endpoints (user list, revenue, voucher batch
		// creation) go in their own group using middleware.RequireAdmin,
		// e.g.:
		// adminData := api.Group("/admin")
		// adminData.Use(middleware.RequireAdmin(db))
		// adminData.GET("/users", adminHandler.ListUsers)
	}

	return router
}