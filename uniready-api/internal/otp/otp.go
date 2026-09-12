package otp

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"math/big"
)

// Generate returns a random 6-digit numeric code as a string, e.g. "042817".
// Uses crypto/rand, not math/rand — this is a security-relevant secret,
// not a UI dice roll.
func Generate() (string, error) {
	max := big.NewInt(1000000) // 0 - 999999
	n, err := rand.Int(rand.Reader, max)
	if err != nil {
		return "", fmt.Errorf("generating otp: %w", err)
	}
	return fmt.Sprintf("%06d", n.Int64()), nil
}

// Hash returns a hex-encoded SHA-256 hash of the code. The raw code is
// never stored — only this hash, so a database leak doesn't hand out
// every unexpired OTP in the system. SHA-256 (not bcrypt) is the right
// call here: these are short-lived, single-use, already rate-limited
// secrets, not long-lived passwords — bcrypt's slow-hashing property adds
// cost without adding real protection for a 6-digit code that expires in
// minutes and is capped at a handful of guesses.
func Hash(code string) string {
	sum := sha256.Sum256([]byte(code))
	return hex.EncodeToString(sum[:])
}

// Verify reports whether the given code matches the stored hash.
func Verify(code, hash string) bool {
	return Hash(code) == hash
}
