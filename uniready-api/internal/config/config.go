package config

import (
	"os"
)

// Config holds everything the app needs to run, loaded once at startup from
// environment variables. Keeping this in one place means there's exactly one
// spot to check when something's misconfigured, instead of os.Getenv calls
// scattered across the codebase.
type Config struct {
	Port        string // HTTP port the API listens on
	DatabaseURL string // Postgres connection string (use a managed provider — Neon/Supabase/Railway — not self-hosted)
	Environment string // "development" or "production" — controls things like verbose logging, CORS strictness

	PaystackSecretKey string // server-side only — verifies webhook signatures and confirms transactions. NEVER expose to the frontend.
	PaystackPublicKey string // safe to expose — the frontend Popup needs this to open a checkout
}

// Load reads config from environment variables, applying sane local-dev
// defaults so `go run` works out of the box without a .env file. In
// production, DATABASE_URL should always be set explicitly — there is no
// sensible default for that one.
//
// Before reading anything, this loads a .env file from the current working
// directory if one exists (see dotenv.go) — so running `go run ./cmd/api`
// from uniready-api/ (where .env normally lives) picks up DATABASE_URL and
// friends automatically, without needing them exported in the shell first.
func Load() Config {
	loadDotEnv(".env")

	return Config{
		Port:        getEnv("PORT", "8080"),
		DatabaseURL: getEnv("DATABASE_URL", ""),
		Environment: getEnv("ENVIRONMENT", "development"),

		PaystackSecretKey: getEnv("PAYSTACK_SECRET_KEY", ""),
		PaystackPublicKey: getEnv("PAYSTACK_PUBLIC_KEY", ""),
	}
}

func (c Config) IsProduction() bool {
	return c.Environment == "production"
}

func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok && value != "" {
		return value
	}
	return fallback
}