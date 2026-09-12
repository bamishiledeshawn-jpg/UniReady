# Uniready — Project Status

Read this first if you're a new session picking this project up.

## Client-confirmed MVP scope

The client has scoped the MVP as: account auth, question/video placeholders,
voucher + promo functionality, admin-configured custom pop-ups on certain
voucher redemptions, and an admin dashboard for monitoring users/data.

**Important scope clarification, confirmed directly with the client:**
private contractors/schools (the organizations vouchers get made for)
have **zero portal access of any kind.** They contact the team through an
external process (email, call — not part of this system) to request a
custom voucher batch. Only internal admins (the client + their dev team)
ever touch the admin dashboard or create voucher batches/pop-up content.
This shaped the `admins` table design from the start — it's manually
provisioned, not self-signup, and completely separate from the
student/agent `users` table.

## Status checklist

### Real and tested end-to-end
- [x] **Student auth** — signup/login/OTP verify, real Postgres, real
      session tokens (see `HANDOFF_AUTH.md`)
- [x] **Voucher redemption**, including custom pop-ups — this is new in
      this pass and is the client's most novel MVP requirement. Confirmed
      working via real HTTP requests against a real database:
  - A voucher tied to a batch with pop-up content returns that content
    (`title`, `message`, `imageUrl`) in the redemption response
  - A voucher with no batch returns no `popup` key at all — frontend
    shows a generic success state, not a broken empty custom one
  - Premium correctly stacks: redeeming a second voucher extends from the
    user's *existing* `premium_until`, not from `now()` — tested and
    confirmed the math is right
  - Redemption is **transactional** — marking a voucher used and granting
    premium either both succeed or both roll back. This was a real bug
    caught during testing (see below — earlier code allowed a voucher to
    become permanently "used" without the user ever getting premium if
    the second step failed)
  - Double-redemption of the same code correctly rejected
  - Missing/invalid auth token correctly rejected (401) before even
    checking the voucher
- [x] Frontend redeem flow — `ProfileMenu`'s voucher input now calls the
      real endpoint and shows `VoucherRedeemedModal` with real returned
      content on success, a real inline error on failure

### Schema exists, no endpoints yet — this is the actual next work
- [ ] **Admin auth** — `admins` and `admin_sessions` tables exist
      (migration `0005`), no login endpoint, no session middleware for
      admins (the `RequireUser` middleware built this pass is
      student-only — admins need their own, separate one, matching the
      "completely separate" requirement)
- [ ] **Admin dashboard endpoints** — user list, user activity detail,
      revenue/redemption tracking, voucher batch creation (with pop-up
      content), voucher generation within a batch. None of this exists as
      an endpoint yet — only the schema does.
- [ ] **Admin dashboard frontend** — doesn't exist at all yet. Needs its
      own login screen and its own layout, entirely separate from the
      student/agent app shell (no shared nav, no shared session).
- [ ] Promo code *redemption* at checkout (attribution at signup is real
      and separate from this — see `AUTH_AND_MONETIZATION.md`)

### Frontend gaps, unchanged from before
- [ ] `Dashboard.jsx` still disconnected from `AuthContext` — fake name
      shown regardless of who's logged in
- [ ] Business/Agency portal UI exists but isn't wired to real endpoints
- [ ] `ProfileMenu`'s "Access Pass" card is still hardcoded ("Weekly
      Subject Pass, 3 days remaining") — doesn't reflect the real
      `premium_until` value that voucher redemption now actually sets

### Backend (`uniready-api`)
- [x] Auth: signup, login, OTP verify (see `HANDOFF_AUTH.md`)
- [x] Voucher redemption (this pass)
- [x] `internal/middleware/auth.go` — `RequireUser`, extracts the logged-in
      student from a session token. **Student-only** — does not work for
      admin sessions, which don't exist as a concept yet.
- [ ] No question bank, practice session, or admin endpoints
- [ ] No payment integration

### Migrations (all tested against a real local Postgres, in order)
1. `0001_init.sql` — `users`, `otp_codes`, `sessions`
2. `0002_google_auth_vouchers_promo.sql` — Google identity, `vouchers`,
   `purchases`, `promo_codes`, `promo_redemptions`
3. `0003_promo_signup_attribution.sql` — `users.referred_by_promo_code_id`
4. `0004_otp_verification_hardening.sql` — `users.is_verified`,
   `otp_codes.attempts`
5. `0005_admin_and_voucher_batches.sql` — `admins`, `admin_sessions`,
   `voucher_batches` (with pop-up content columns), replaces `vouchers`'
   old free-text `batch_label` with a real `batch_id` foreign key
6. `0006_user_premium_status.sql` — `users.premium_until`

### Accounts / external services (human, not code, action)
- [ ] Managed Postgres, SMS/OTP provider, Paystack, hosting — unchanged
      from before, still not set up
- [ ] Google OAuth credentials

### Not started
- [ ] Privacy policy / Terms of Service
- [ ] Security pass on auth + payments
- [ ] Video lesson content/playback

## The actual next blocker

**Admin auth**, specifically — it's the same shape of problem student auth
was a few passes ago: nothing downstream (the whole admin dashboard) works
until a real admin can log in. Given the "completely separate" requirement,
this needs its own middleware, its own session mechanism, and — worth
deciding early — its own frontend route tree with no shared layout or nav
with the student app, not just a different login form reusing the same
shell.

## A real bug worth knowing about, caught during this pass

The first version of the voucher redemption handler did the "mark voucher
used" and "grant premium" steps as two separate, non-transactional
database calls. When the second step failed (a real bug — a Postgres
interval-construction error, since fixed), the voucher was still
permanently marked as used, with no premium ever granted and no way to
recover except a manual database fix. Wrapped both steps in a single
transaction with row-level locking (`FOR UPDATE`) to close this — worth
keeping this pattern in mind for any other multi-step "consume something,
then grant something" endpoint built later (promo redemption at checkout
will have the exact same shape of risk).
