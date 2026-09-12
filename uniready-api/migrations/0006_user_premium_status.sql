-- Voucher redemption needs to actually do something — grant N days of
-- premium access. There was nowhere on the user record to represent
-- that until now.
ALTER TABLE users ADD COLUMN premium_until TIMESTAMPTZ;
