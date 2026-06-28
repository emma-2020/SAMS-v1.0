-- ================================================================
-- SAMS v1.0  —  Player Registration Module
-- ================================================================
-- Creates:
--   player_registrations  — full registration record per player
--   storage bucket        — registration-documents (private)
--   RLS policies
--
-- NOTE: All player-filled fields are nullable at the DB level.
-- Required-field enforcement happens in registration.service.js
-- at submission time (status → 'submitted').
-- ================================================================

-- ================================================================
-- 1. PLAYER REGISTRATIONS
-- ================================================================

CREATE TABLE player_registrations (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  academy_id  UUID        NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
  player_id   UUID        NOT NULL REFERENCES users(id)     ON DELETE CASCADE,

  -- Lifecycle: draft → submitted → approved | rejected
  status      TEXT        NOT NULL DEFAULT 'draft'
                CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),

  -- ── Section 1: Personal Details ──────────────────────────────
  date_of_birth   DATE,
  phone           TEXT,
  address         TEXT,
  nationality     TEXT,
  blood_group     TEXT,

  -- ── Section 2: Sport Details ──────────────────────────────────
  position            TEXT,
  preferred_foot      TEXT    CHECK (preferred_foot IN ('Left', 'Right', 'Both')),
  previous_club       TEXT,
  years_of_experience SMALLINT,

  -- ── Section 3: Emergency Contact ─────────────────────────────
  emergency_contact_name         TEXT,
  emergency_contact_phone        TEXT,
  emergency_contact_relationship TEXT,

  -- ── Section 4: Parent / Guardian (optional) ──────────────────
  parent_guardian_name         TEXT,
  parent_guardian_phone        TEXT,
  parent_guardian_relationship TEXT,

  -- ── Section 5: Medical (optional) ────────────────────────────
  medical_conditions  TEXT,
  allergies           TEXT,

  -- ── Section 6: Document storage paths (optional) ─────────────
  -- Stored as Supabase Storage paths, resolved to signed URLs by the backend.
  birth_certificate_path  TEXT,
  passport_photo_path     TEXT,
  national_id_path        TEXT,
  parent_consent_path     TEXT,

  -- ── Admin review ─────────────────────────────────────────────
  reviewed_by      UUID        REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at      TIMESTAMPTZ,
  rejection_reason TEXT,

  -- ── Timestamps ───────────────────────────────────────────────
  submitted_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One registration per player per academy
  CONSTRAINT uq_registration_per_player UNIQUE (academy_id, player_id)
);

COMMENT ON TABLE  player_registrations            IS 'Full GFA-aligned player registration records.';
COMMENT ON COLUMN player_registrations.academy_id IS 'Tenant isolation key.';
COMMENT ON COLUMN player_registrations.status     IS 'draft→submitted→approved|rejected lifecycle.';
COMMENT ON COLUMN player_registrations.birth_certificate_path IS 'Supabase Storage path — not a full URL.';

CREATE INDEX idx_player_reg_academy_id  ON player_registrations (academy_id);
CREATE INDEX idx_player_reg_player_id   ON player_registrations (player_id);
CREATE INDEX idx_player_reg_status      ON player_registrations (academy_id, status);

-- Auto-stamp updated_at on every change
CREATE OR REPLACE FUNCTION fn_player_registration_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_player_registration_updated_at
BEFORE UPDATE ON player_registrations
FOR EACH ROW EXECUTE FUNCTION fn_player_registration_updated_at();


-- ================================================================
-- 2. ROW LEVEL SECURITY
-- ================================================================

ALTER TABLE player_registrations ENABLE ROW LEVEL SECURITY;

-- Tenant isolation: all access scoped to the user's academy
CREATE POLICY tenant_isolation ON player_registrations
  FOR ALL USING (academy_id = auth_academy_id());

-- Players can read their own record; Admin/Coach can read all
CREATE POLICY player_own_record_read ON player_registrations
  FOR SELECT USING (
    academy_id = auth_academy_id()
    AND (
      player_id = auth.uid()
      OR auth_user_role() IN ('Admin', 'Coach')
    )
  );

-- Players can insert only their own record
CREATE POLICY player_own_record_write ON player_registrations
  FOR INSERT WITH CHECK (
    academy_id = auth_academy_id()
    AND player_id = auth.uid()
    AND auth_user_role() = 'Player'
  );

-- Players can update own draft/rejected; Admin can always update
CREATE POLICY player_own_record_update ON player_registrations
  FOR UPDATE USING (
    academy_id = auth_academy_id()
    AND (
      (player_id = auth.uid() AND status IN ('draft', 'rejected'))
      OR auth_user_role() = 'Admin'
    )
  );


-- ================================================================
-- 3. STORAGE BUCKET — registration-documents (private)
-- ================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'registration-documents',
  'registration-documents',
  false,
  10485760,
  ARRAY['image/jpeg','image/jpg','image/png','image/webp','application/pdf']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Players can upload registration documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'registration-documents');

CREATE POLICY "Authenticated users can read registration documents"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'registration-documents');

CREATE POLICY "Authenticated users can delete registration documents"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'registration-documents');


-- ================================================================
-- END OF MIGRATION 020
-- ================================================================
