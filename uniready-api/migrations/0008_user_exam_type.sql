-- Onboarding needs somewhere to store which exam a student is prepping
-- for (JAMB/WAEC/NECO), so the dashboard can greet them accordingly
-- instead of a hardcoded exam/year string.
ALTER TABLE users ADD COLUMN exam_type TEXT;