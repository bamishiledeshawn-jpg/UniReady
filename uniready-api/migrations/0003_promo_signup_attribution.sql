-- Captures which promo code, if any, a user entered at signup — this is
-- attribution ("who referred this person"), a separate concept from
-- promo_redemptions (which tracks the discount/commission on an actual
-- paid purchase). A user can be attributed to a promo code without ever
-- making a purchase; promo_redemptions only exists once they do.

ALTER TABLE users ADD COLUMN referred_by_promo_code_id UUID REFERENCES promo_codes (id);

CREATE INDEX idx_users_referred_by_promo_code_id ON users (referred_by_promo_code_id);
