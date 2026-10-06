package handlers

import (
	"crypto/rand"
	"strings"
)

// 31 characters: no 0/O, 1/I/L, which are easy to misread when a code is
// printed or typed from a screenshot.
const voucherAlphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
const voucherCodeLength = 12

// NormalizeVoucherCode reduces whatever a student typed to the canonical
// form that is hashed and stored: uppercase, with spaces and dashes removed.
func NormalizeVoucherCode(raw string) string {
	var b strings.Builder
	for _, r := range strings.ToUpper(raw) {
		switch r {
		case ' ', '-', '\t', '\n', '\r':
			continue
		}
		b.WriteRune(r)
	}
	return b.String()
}

func generateVoucherCode() (string, error) {
	out := make([]byte, 0, voucherCodeLength)
	buf := make([]byte, 32)
	for len(out) < voucherCodeLength {
		if _, err := rand.Read(buf); err != nil {
			return "", err
		}
		for _, b := range buf {
			// 248 = 31 * 8, the largest multiple of 31 that fits in a
			// byte; discarding the rest keeps every character equally likely.
			if b >= 248 {
				continue
			}
			out = append(out, voucherAlphabet[int(b)%len(voucherAlphabet)])
			if len(out) == voucherCodeLength {
				break
			}
		}
	}
	return string(out), nil
}

func formatVoucherCode(canonical string) string {
	return canonical[0:4] + "-" + canonical[4:8] + "-" + canonical[8:12]
}