package sms

import (
	"context"
	"log"
)

// Sender is the interface every SMS provider integration implements. Swap
// ConsoleSender below for a real Termii/Africa's Talking client once that
// account exists — nothing else in this codebase needs to change, since
// every caller depends on this interface, not a concrete provider.
type Sender interface {
	Send(ctx context.Context, phoneNumber, message string) error
}

// ConsoleSender logs the message instead of sending a real SMS. This is
// what lets the entire OTP flow be built and tested end-to-end right now,
// with zero SMS provider account or cost — swap this out for the real
// thing when that account exists, and not a moment before, since every
// real SMS costs money and this stage is pure development/testing.
type ConsoleSender struct{}

func NewConsoleSender() *ConsoleSender {
	return &ConsoleSender{}
}

func (s *ConsoleSender) Send(ctx context.Context, phoneNumber, message string) error {
	log.Printf("[SMS -> %s]: %s", phoneNumber, message)
	return nil
}
