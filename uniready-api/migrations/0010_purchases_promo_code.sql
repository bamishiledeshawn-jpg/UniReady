-- Remembers which promo code (if any) was applied when a purchase was
-- initiated, so that once Paystack confirms payment (via webhook), we
-- know which promo_redemptions row to create — without trusting
-- anything echoed back from Paystack's metadata for something that
-- affects money and commission payouts.
ALTER TABLE purchases ADD COLUMN promo_code_id UUID REFERENCES promo_codes (id);