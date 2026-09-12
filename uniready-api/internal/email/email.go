package email

import (
	"context"
	"log"
)

// Sender mirrors internal/sms.Sender exactly — same reasoning applies:
// swap ConsoleSender for a real provider (e.g. Postmark, SendGrid, Resend)
// once that account exists. Nothing else in this codebase needs to change.
type Sender interface {
	Send(ctx context.Context, toEmail, subject, body string) error
}

// ConsoleSender logs the email instead of sending a real one — lets the
// entire email-OTP flow be built and tested end-to-end with zero email
// provider account or cost, same rationale as sms.ConsoleSender.
type ConsoleSender struct{}

func NewConsoleSender() *ConsoleSender {
	return &ConsoleSender{}
}

func (s *ConsoleSender) Send(ctx context.Context, toEmail, subject, body string) error {
	log.Printf("[EMAIL -> %s] Subject: %s | Body: %s", toEmail, subject, body)
	return nil
}