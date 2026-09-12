package phone

import (
	"fmt"
	"regexp"
)

var digitsOnly = regexp.MustCompile(`\D`)

// Normalize validates a Nigerian phone number in either local (0801...,
// 11 digits) or international (234801..., or +234801...) form, and
// returns it in a single canonical form (+234801...). Storing and
// comparing phone numbers in one consistent format is what makes the
// UNIQUE constraint on users.phone_number actually work as intended —
// "08012345678" and "+2348012345678" need to be recognized as the same
// number, not treated as two different accounts.
func Normalize(raw string) (string, error) {
	digits := digitsOnly.ReplaceAllString(raw, "")

	switch {
	case len(digits) == 11 && digits[0] == '0':
		return "+234" + digits[1:], nil
	case len(digits) == 13 && digits[0:3] == "234":
		return "+" + digits, nil
	default:
		return "", fmt.Errorf("invalid Nigerian phone number")
	}
}
