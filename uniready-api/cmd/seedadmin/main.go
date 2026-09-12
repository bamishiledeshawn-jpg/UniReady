// Command seedadmin creates an admin account directly in the database.
// This is intentionally a CLI tool, not an HTTP endpoint — admin accounts
// should never be creatable over the network, only by someone with direct
// database/server access.
//
// Usage:
//
//	go run ./cmd/seedadmin -email admin@example.com -password "a-real-password" -name "Your Name"
package main

import (
	"context"
	"flag"
	"fmt"
	"log"

	"github.com/deshawn/uniready-api/internal/config"
	"github.com/deshawn/uniready-api/internal/database"
	"github.com/deshawn/uniready-api/internal/password"
)

func main() {
	email := flag.String("email", "", "admin email address (required)")
	pass := flag.String("password", "", "admin password (required)")
	name := flag.String("name", "", "admin full name (required)")
	flag.Parse()

	if *email == "" || *pass == "" || *name == "" {
		log.Fatal("all three flags are required: -email, -password, -name")
	}
	if len(*pass) < 8 {
		log.Fatal("password must be at least 8 characters")
	}

	cfg := config.Load()
	ctx := context.Background()

	db, err := database.New(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("failed to connect to database: %v", err)
	}
	defer db.Close()

	hash, err := password.Hash(*pass)
	if err != nil {
		log.Fatalf("failed to hash password: %v", err)
	}

	var id string
	err = db.QueryRow(ctx, `
		INSERT INTO admins (email, password_hash, full_name)
		VALUES ($1, $2, $3)
		RETURNING id
	`, *email, hash, *name).Scan(&id)
	if err != nil {
		log.Fatalf("failed to create admin: %v", err)
	}

	fmt.Printf("Admin created: %s (%s), id=%s\n", *name, *email, id)
}