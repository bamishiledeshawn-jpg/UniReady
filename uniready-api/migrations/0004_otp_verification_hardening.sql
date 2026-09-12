-- Two additions needed for real OTP verify/login logic to work:
--
-- 1. users.is_verified — distinguishes a fully signed-up account from a
--    row that only exists because someone started signup and hasn't
--    completed OTP verification yet. Login should only succeed against
--    verified accounts.
--
-- 2. otp_codes.attempts — caps how many wrong guesses a single OTP code
--    accepts before it's invalidated. A 6-digit code has 1,000,000
--    possibilities; without a per-code attempt cap, someone could brute
--    force it within its expiry window. After too many wrong attempts,
--    the code stops working and a new one must be requested (which is
--    itself rate-limited — see the cooldown logic in the auth handlers).

ALTER TABLE users ADD COLUMN is_verified BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE otp_codes ADD COLUMN attempts INTEGER NOT NULL DEFAULT 0;
