package password

import "golang.org/x/crypto/bcrypt"

// Hash and Verify are for admin account passwords specifically — long-lived
// credentials, unlike OTP codes (internal/otp) or session tokens
// (internal/session), which are short-lived and already rate-limited.
// bcrypt's deliberate slowness is the right tradeoff here in a way it
// isn't for a 6-digit code that expires in 5 minutes.

func Hash(plaintext string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(plaintext), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}
	return string(bytes), nil
}

func Verify(plaintext, hash string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(plaintext)) == nil
}