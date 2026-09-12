-- Two additions, both driven by the client's stated MVP scope:
--
-- 1. Admins are a completely separate identity from students/agents —
--    not a flag on the users table, a different table entirely, with
--    their own session mechanism. Nothing here shares any state with
--    the student/agent auth system (users, sessions) built earlier.
--
-- 2. Voucher batches formalize what was previously just a free-text
--    label on each voucher, and add admin-configured pop-up content
--    ("private contracts" per the client — e.g. a school or
--    organization's negotiated deal gets its own branded redemption
--    message). Only admins create these; there's no self-serve path
--    for agents to set their own pop-up content.

-- ---------------------------------------------------------------------
-- Admin auth — separate table, separate sessions, separate everything.
-- Email + password (not phone/OTP) since this is a small, trusted,
-- manually-provisioned set of accounts, not open self-signup.
-- ---------------------------------------------------------------------
CREATE TABLE admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE admin_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES admins (id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_admin_sessions_admin_id ON admin_sessions (admin_id);

-- ---------------------------------------------------------------------
-- Voucher batches — replaces the old free-text batch_label. Each batch
-- can carry its own pop-up content, shown to a student when they redeem
-- a voucher belonging to it. A batch with no pop-up content set just
-- shows a generic success message — pop-ups are opt-in per batch, not
-- mandatory.
-- ---------------------------------------------------------------------
CREATE TABLE voucher_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    label TEXT NOT NULL, -- internal name, e.g. "Greenfield Academy — Term 1 2026"
    popup_title TEXT,
    popup_message TEXT,
    popup_image_url TEXT,
    created_by UUID NOT NULL REFERENCES admins (id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE vouchers ADD COLUMN batch_id UUID REFERENCES voucher_batches (id);
ALTER TABLE vouchers DROP COLUMN batch_label;

CREATE INDEX idx_vouchers_batch_id ON vouchers (batch_id);
