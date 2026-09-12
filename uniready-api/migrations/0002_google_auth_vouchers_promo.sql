-- Adds a second identity path (Google) alongside phone+OTP, and the schema
-- for the two separate monetization mechanisms: vouchers (pre-paid, sold
-- directly) and promo codes (live discount + commission on a real purchase).

-- ---------------------------------------------------------------------
-- Google as an alternate identity. A user now needs phone_number OR
-- google_id, not necessarily both — someone who signs up with Google
-- doesn't have a phone number on the account until they add one later.
-- ---------------------------------------------------------------------
ALTER TABLE users ALTER COLUMN phone_number DROP NOT NULL;
ALTER TABLE users ADD COLUMN email TEXT UNIQUE;
ALTER TABLE users ADD COLUMN google_id TEXT UNIQUE;
ALTER TABLE users ADD CONSTRAINT users_identity_present
    CHECK (phone_number IS NOT NULL OR google_id IS NOT NULL);

-- ---------------------------------------------------------------------
-- Vouchers — pre-paid, like a gift card. An agent generates and sells a
-- batch; each one redeems once for a fixed number of days of premium.
-- The redeemable code is hashed, not stored in plain text, the same way
-- OTP codes and session tokens are — a database leak shouldn't hand out
-- every unredeemed voucher in the system.
-- ---------------------------------------------------------------------
CREATE TABLE vouchers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code_hash TEXT NOT NULL UNIQUE,
    batch_label TEXT, -- free-text label for the generation batch this belongs to
    premium_days INTEGER NOT NULL,
    agent_id UUID REFERENCES users (id), -- who this voucher was issued to for resale
    redeemed_by UUID REFERENCES users (id),
    redeemed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_vouchers_agent_id ON vouchers (agent_id);

-- ---------------------------------------------------------------------
-- Purchases — minimal record of a premium purchase. Real payment
-- integration (Paystack) isn't wired up yet; this table exists now so
-- promo_redemptions below has something concrete to reference. Money is
-- stored in kobo (smallest currency unit) to avoid floating-point
-- rounding issues, which is standard practice for handling Naira.
-- ---------------------------------------------------------------------
CREATE TABLE purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users (id),
    amount_kobo INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- pending | success | failed
    payment_reference TEXT, -- set once a real payment provider is wired up
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_purchases_user_id ON purchases (user_id);

-- ---------------------------------------------------------------------
-- Promo codes — unlike vouchers, these aren't pre-paid or secret. Any
-- user can own one (agent-only tiers with better rates are a planned
-- future addition — agent_tier exists now as a placeholder column so
-- that doesn't require another migration later). Using one at checkout
-- discounts the purchase and earns the owner a commission. Both rates
-- are set per code, not globally, since they need to be configurable
-- per code or per future agent tier.
-- ---------------------------------------------------------------------
CREATE TABLE promo_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    owner_id UUID NOT NULL REFERENCES users (id),
    discount_percent NUMERIC(5, 2) NOT NULL,
    commission_percent NUMERIC(5, 2) NOT NULL,
    agent_tier TEXT, -- reserved for the future tiered-commission system
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_promo_codes_owner_id ON promo_codes (owner_id);

-- One row per redemption, capturing the rates that actually applied at
-- that moment — so a later change to a code's rate doesn't rewrite the
-- history of what someone was actually charged or paid.
CREATE TABLE promo_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    promo_code_id UUID NOT NULL REFERENCES promo_codes (id),
    purchase_id UUID NOT NULL REFERENCES purchases (id) UNIQUE,
    discount_percent_applied NUMERIC(5, 2) NOT NULL,
    commission_percent_applied NUMERIC(5, 2) NOT NULL,
    commission_amount_kobo INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_promo_redemptions_promo_code_id ON promo_redemptions (promo_code_id);