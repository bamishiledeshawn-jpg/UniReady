# Auth & Monetization — Design Summary

Covers the Sign Up / Log In flow (now real, backend-wired) and the two
separate monetization mechanisms (vouchers, promo codes) including how
promo codes get attributed at signup.

## Sign Up / Log In flow — now real

One screen, `/login`, with a toggle:

- **Sign Up** — name, phone, email, and an optional promo code
- **Log In** — just a phone number (or Google)

Both call real `uniready-api` endpoints (`POST /api/v1/auth/signup` /
`POST /api/v1/auth/login`) and finish on `/login/verify`, which calls
`POST /api/v1/auth/otp/verify`. This is genuinely tested end-to-end — see
`HANDOFF_AUTH.md` for exactly what was verified against a real database.

**Google** still returns a clear "not configured" error — there's no real
OAuth integration yet, just an honest stub rather than either faking
success or not existing as a route.

## Vouchers vs. promo codes vs. signup attribution

Three related but distinct things:

| | Vouchers | Promo codes | Signup attribution |
|---|---|---|---|
| What it is | Pre-paid code, redeems for premium | Live discount + commission on a purchase | Which promo code (if any) brought a user in |
| When it matters | At redemption | At checkout | At signup |
| Table | `vouchers` | `promo_codes` / `promo_redemptions` | `users.referred_by_promo_code_id` |
| Status | Schema only, no endpoints | Schema only, no endpoints | **Real** — set correctly by `/auth/signup`, verified end-to-end |

**Signup attribution is real now**, specifically: entering a valid, active
promo code at signup sets `referred_by_promo_code_id` on the new user row.
An invalid or made-up code doesn't block signup — it's silently ignored
(the response includes `promoCodeApplied: false` so the frontend could
show a "code not found" note if desired, though it currently doesn't).

**Why attribution is separate from redemption:** someone can enter a promo
code at signup and never make a purchase — that's still useful information,
but it's not a financial event. `promo_redemptions` only gets a row when an
actual paid purchase happens with a code applied at checkout — and that
can't happen at all yet, since there's no payment integration.

**Rates are per-code, not global** — `discount_percent` and
`commission_percent` live on each `promo_codes` row. `agent_tier` exists on
that table as a placeholder for the future tiered-commission system,
unused until that's built.

## What's still missing before promo codes/vouchers fully work

- No endpoints for vouchers or promo redemption — only signup attribution
  is wired up
- Payment integration (Paystack) — promo *redemptions* specifically can't
  function until this exists, since a commission only means something once
  a real purchase happens
- Commission payout mechanism — undecided (wallet balance vs. the existing
  bank/mobile-money payout request flow from the original Business/Agency
  blueprint)
- Tiered agent commission rates — column exists, logic doesn't
