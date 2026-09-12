package session

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
)

// GenerateToken returns a random 32-byte token, hex-encoded (64 characters).
// This is what gets handed to the client and sent back on every
// authenticated request — never stored in the database in this raw form.
func GenerateToken() (string, error) {
	buf := make([]byte, 32)
	if _, err := rand.Read(buf); err != nil {
		return "", fmt.Errorf("generating session token: %w", err)
	}
	return hex.EncodeToString(buf), nil
}

// Hash returns a hex-encoded SHA-256 hash of a session token, for storage
// and lookup — the same principle as OTP hashing: a database leak
// shouldn't hand out working session tokens for every logged-in user.
func Hash(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}
