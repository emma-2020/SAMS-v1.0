-- ================================================================
-- Migration 026: Signup date-of-birth + Terms of Service consent
-- ================================================================
-- Adds:
--   users.date_of_birth     DATE        — optional, captured at account
--                                         creation (invite-acceptance).
--                                         Never required; NULL forever for
--                                         pre-existing users (no backfill).
--   users.terms_accepted_at TIMESTAMPTZ — when the user checked "I agree to
--                                         the Terms of Service and Privacy
--                                         Policy" at signup. NULL for users
--                                         who registered before this feature
--                                         existed.
--   users.terms_version     TEXT        — which version of the placeholder
--                                         legal text they accepted (see
--                                         TERMS_VERSION in auth.service.js).
--
-- Purely additive / forward-only: all three columns are nullable with no
-- default-driven backfill, so existing rows are unaffected and existing
-- login/read flows keep working unchanged.
-- ================================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS date_of_birth DATE;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS terms_version TEXT;

COMMENT ON COLUMN users.date_of_birth IS
  'Optional date of birth captured at signup/invite-acceptance. Never required. NULL for users who registered before this column existed (no backfill).';

COMMENT ON COLUMN users.terms_accepted_at IS
  'Timestamp the user checked "I agree to the Terms of Service and Privacy Policy" during signup/invite-acceptance. NULL for users who registered before this feature existed.';

COMMENT ON COLUMN users.terms_version IS
  'Version string of the (placeholder) legal text accepted at terms_accepted_at, e.g. "v1-draft". See TERMS_VERSION constant in backend/src/services/auth.service.js.';
