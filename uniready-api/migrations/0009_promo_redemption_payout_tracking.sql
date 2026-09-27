-- Tracks whether a redemption's commission has been included in a
-- biweekly payout run yet. NULL = still pending, owed to the promo code
-- owner. Set once (manually, by an admin action) when a payout batch is
-- processed — see the payout-batch work still to be built.
ALTER TABLE promo_redemptions ADD COLUMN paid_out_at TIMESTAMPTZ;