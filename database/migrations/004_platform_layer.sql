-- ================================================================
-- SAMS SaaS Control Plane — Migration 004
-- Run AFTER migrations 002 and 003.
--
-- Creates two platform-level tables that sit completely outside
-- the academy tenant boundary. No academy_id FK, no RLS policies.
-- All access is via supabaseAdmin (service-role key) only.
--
-- Tables:
--   platform_admins             — platform owner login credentials
--   platform_enrollment_requests — academy signup intake queue
-- ================================================================


-- ================================================================
-- 1. PLATFORM ADMINS
-- Stores login credentials for SAMS platform owners/operators.
-- Completely separate from the academy `users` table.
-- Passwords are bcrypt-hashed in the service layer before insert.
-- ================================================================

CREATE TABLE IF NOT EXISTS platform_admins (
  id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name           TEXT        NOT NULL,
  email          TEXT        NOT NULL UNIQUE,
  password_hash  TEXT        NOT NULL,
  is_active      BOOLEAN     NOT NULL DEFAULT TRUE,
  last_login_at  TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  platform_admins               IS 'SAMS platform operator accounts. Not linked to any academy.';
COMMENT ON COLUMN platform_admins.password_hash IS 'bcrypt hash — never store plaintext.';
COMMENT ON COLUMN platform_admins.is_active     IS 'FALSE blocks login without deleting the record.';

CREATE INDEX IF NOT EXISTS idx_platform_admins_email ON platform_admins (email);


-- ================================================================
-- 2. PLATFORM ENROLLMENT REQUESTS
-- Every academy that submits an intake form lands here.
-- status lifecycle:  pending → approved | rejected
-- ================================================================

CREATE TABLE IF NOT EXISTS platform_enrollment_requests (
  id                 UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  academy_name       TEXT        NOT NULL,
  contact_name       TEXT        NOT NULL,
  contact_email      TEXT        NOT NULL,
  sport              TEXT,
  estimated_players  INT,
  message            TEXT,
  status             TEXT        NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason   TEXT,
  reviewed_by        UUID        REFERENCES platform_admins(id) ON DELETE SET NULL,
  reviewed_at        TIMESTAMPTZ,
  -- academy_id populated on approval, links to the provisioned academy
  provisioned_academy_id UUID,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  platform_enrollment_requests                       IS 'Academy onboarding intake queue.';
COMMENT ON COLUMN platform_enrollment_requests.status                IS 'pending = awaiting review, approved = academy provisioned, rejected = declined.';
COMMENT ON COLUMN platform_enrollment_requests.provisioned_academy_id IS 'Set on approval — FK to academies.id (not enforced at DB level to avoid cross-schema coupling).';

CREATE INDEX IF NOT EXISTS idx_enrollment_requests_status    ON platform_enrollment_requests (status);
CREATE INDEX IF NOT EXISTS idx_enrollment_requests_email     ON platform_enrollment_requests (contact_email);
CREATE INDEX IF NOT EXISTS idx_enrollment_requests_created   ON platform_enrollment_requests (created_at DESC);


-- ================================================================
-- NO RLS on these tables.
-- They are accessed exclusively via the service-role key
-- (supabaseAdmin) which bypasses RLS entirely. Academy users
-- running with the anon or user key will never see these rows.
-- ================================================================


-- ================================================================
-- SEED: Default platform admin
-- Change this password immediately after first login.
-- Hash below = bcrypt("SAMSplatform2024!")  rounds=12
-- Run in SQL editor to create your first platform admin account.
-- ================================================================

-- INSERT INTO platform_admins (name, email, password_hash)
-- VALUES (
--   'Platform Admin',
--   'admin@samsplatform.com',
--   '$2b$12$placeholder_replace_with_real_bcrypt_hash'
-- );

-- ================================================================
-- END OF MIGRATION 004
-- ================================================================
