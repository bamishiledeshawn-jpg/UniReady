package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

// RateLimiter is a simple fixed-window limiter keyed by client IP. This is
// intentionally basic — in-memory, single-instance only — which is fine
// while there's one API server. The moment you run more than one instance
// behind a load balancer, this needs to move to Redis (shared state across
// instances) instead of living in each process's memory. Flagging that now
// so it's not a surprise later: don't let this be the thing that quietly
// stops working when you scale horizontally.
//
// This exists specifically because OTP/auth endpoints are a common abuse
// target (scripted requests spamming SMS to random numbers, which you get
// billed for) — apply this middleware to those routes specifically, not
// necessarily every route in the API.
type RateLimiter struct {
	mu       sync.Mutex
	requests map[string][]time.Time
	limit    int
	window   time.Duration
}

func NewRateLimiter(limit int, window time.Duration) *RateLimiter {
	rl := &RateLimiter{
		requests: make(map[string][]time.Time),
		limit:    limit,
		window:   window,
	}
	go rl.cleanupLoop()
	return rl
}

func (rl *RateLimiter) Middleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		key := c.ClientIP()

		rl.mu.Lock()
		now := time.Now()
		cutoff := now.Add(-rl.window)

		// Drop timestamps outside the current window
		var recent []time.Time
		for _, t := range rl.requests[key] {
			if t.After(cutoff) {
				recent = append(recent, t)
			}
		}

		if len(recent) >= rl.limit {
			rl.mu.Unlock()
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error": "too many requests, please try again shortly",
			})
			c.Abort()
			return
		}

		recent = append(recent, now)
		rl.requests[key] = recent
		rl.mu.Unlock()

		c.Next()
	}
}

// cleanupLoop periodically clears out stale entries so this map doesn't
// grow forever. Runs for the lifetime of the process.
func (rl *RateLimiter) cleanupLoop() {
	ticker := time.NewTicker(10 * time.Minute)
	defer ticker.Stop()
	for range ticker.C {
		rl.mu.Lock()
		cutoff := time.Now().Add(-rl.window)
		for key, times := range rl.requests {
			var recent []time.Time
			for _, t := range times {
				if t.After(cutoff) {
					recent = append(recent, t)
				}
			}
			if len(recent) == 0 {
				delete(rl.requests, key)
			} else {
				rl.requests[key] = recent
			}
		}
		rl.mu.Unlock()
	}
}
