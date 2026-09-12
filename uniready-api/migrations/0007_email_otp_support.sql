-- Allows OTP delivery via email, for users who sign up/log in with an
-- email address and no phone number. Phone remains fully supported and
-- unchanged for everyone who does provide one — this only removes the
-- requirement that phone_number always be present.

ALTER TABLE otp_codes ALTER COLUMN phone_number DROP NOT NULL;
ALTER TABLE otp_codes ADD COLUMN email TEXT;
ALTER TABLE otp_codes ADD CONSTRAINT otp_codes_identifier_present
    CHECK (phone_number IS NOT NULL OR email IS NOT NULL);

CREATE INDEX idx_otp_codes_email ON otp_codes (email);

-- users already allowed phone_number OR google_id (see migration 0002).
-- Extend that to also accept an email-only account.
ALTER TABLE users DROP CONSTRAINT users_identity_present;
ALTER TABLE users ADD CONSTRAINT users_identity_present
    CHECK (phone_number IS NOT NULL OR google_id IS NOT NULL OR email IS NOT NULL);