# Onboarding: Uniready Project — Auth & Handoff Notes

Written for whoever touches auth next. **As of this pass, auth is real —
not simulated.** Signup, login, and OTP verification all go through actual
HTTP calls to `uniready-api`, backed by a real Postgres database. This is
the first version of this doc where that sentence is true; earlier
versions describe a `localStorage`-only simulation that has now been
replaced. Read `AUTH_AND_MONETIZATION.md` for the voucher/promo code
schema, and `PROJECT_STATUS.md` for the full project picture.

## What's real

- **`uniready-api/internal/server/handlers/auth.go`** — `Signup`, `Login`,
  `VerifyOTP`, and a `Google` stub. All tested against a real local
  Postgres with real HTTP requests during this build, not just written and
  assumed to work. Specifically verified:
  - Signup creates a pending (unverified) user, sends a real hashed OTP
  - Wrong OTP codes are rejected and increment an attempt counter
  - 5 wrong attempts locks the code (must request a new one)
  - Correct OTP verifies, issues a real session token, returns real user
    data
  - A phone that already has a verified account gets a 409 on signup
    ("already registered — log in instead")
  - A phone with no account gets a 404 on login ("no account found — sign
    up instead")
  - Requesting a code twice within 60 seconds is rejected (429, matches
    the frontend's resend cooldown exactly)
  - A valid, active promo code entered at signup correctly sets
    `users.referred_by_promo_code_id`; an invalid/fake code is silently
    ignored rather than blocking signup
- **`uniready-frontend/src/context/AuthContext.jsx`** — now makes real
  `fetch` calls to the endpoints above instead of writing directly to
  `localStorage`. The session token IS still stored in `localStorage` —
  that part is normal and expected (most web apps do this) — but the
  token itself is now genuinely issued by the server, not fabricated
  client-side.
- **`AuthEntry.jsx`** (replaces the old `SignUp.jsx`) and `OtpVerify.jsx`
  show the backend's actual error messages rather than frontend-invented
  copy — e.g. a rate-limit hit shows the server's real "too many code
  requests" message with the real retry time.

## What's still NOT real

- **SMS is simulated via `ConsoleSender`** (`internal/sms/sms.go`) — OTP
  codes are logged to the server console, not actually texted anywhere.
  This is intentional: there's no SMS provider account yet (see
  `PROJECT_STATUS.md`), and building against a console logger means the
  entire flow is provably correct *before* spending real money on SMS.
  Swapping in a real provider is a one-file change — implement `Sender`
  for Termii/Africa's Talking, swap the one line in `server.go` that
  constructs `smsSender`.
- **Google sign-in is a stub.** The endpoint exists and returns an honest
  "not configured" error — it does not verify a real Google token, because
  there are no Google OAuth credentials configured yet.
- **Logout only clears the local copy of the session.** There's no
  `DELETE /api/v1/auth/session` (or similar) to invalidate the token
  server-side — a "logged out" token would technically still work against
  the API until it naturally expires (30 days). Worth adding before this
  matters for real security.
- **CORS is wide open** (`AllowOrigins: []string{"*"}` in `server.go`) —
  fine for local development, must be locked to the real frontend
  origin(s) before production.

## A tuning note worth knowing about, found during testing

The IP-based rate limiter (`middleware.NewRateLimiter`, 5 requests/minute,
applied to the whole `/auth` route group) and the per-phone OTP-attempt
lockout (5 wrong guesses) can compound in a way that's worth being aware
of: a legitimate user who fat-fingers their code a few times could
plausibly hit the *IP* limit (5 requests/minute total across signup/login/
verify) before they hit the intentional 5-attempt code lockout, since every
verify attempt also counts against the IP limit. Neither number is wrong
on its own, but they weren't tuned together — worth revisiting once there's
real usage data, rather than guessing at better numbers now.

## Prerequisite for anything beyond auth

With auth now real, the next things that need it are: question bank
endpoints, practice session persistence, and voucher/promo-code
redemption endpoints — all still schema-only, same as before this pass.
See `PROJECT_STATUS.md` for the full list.
