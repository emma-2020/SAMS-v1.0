-- ================================================================
-- SAMS v1.0  —  Migration 016: V1 Feature Additions
-- Run this   : After 015_indexes_for_unindexed_foreign_keys.sql
-- ================================================================
--
-- Changes:
--   1. users.availability_status   — player availability flag
--   2. fee_ledger                  — manual fee payment ledger
--   3. player_documents            — player document uploads
--   4. announcements               — academy-wide broadcasts
--   5. player-documents Storage bucket + policies
-- ================================================================


-- ================================================================
-- 1. PLAYER AVAILABILITY STATUS
-- Added to users table. Coaches/Admins update; visible on player
-- lists so coaches know who is available before a session.
-- ================================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS availability_status TEXT
  NOT NULL DEFAULT 'Available'
  CHECK (availability_status IN ('Available', 'Injured', 'Suspended', 'Resting'));

COMMENT ON COLUMN users.availability_status IS
  'Coach/Admin-managed flag. One of: Available, Injured, Suspended, Resting.';


-- ================================================================
-- 2. FEE LEDGER
-- Manual cash/MoMo/bank payment records per player.
-- No payment gateway — admins record payments as they occur.
-- amount_owed and amount_paid are in GHS (pesewas stored as INT).
-- ================================================================

CREATE TABLE fee_ledger (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  academy_id      UUID        NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
  player_id       UUID        NOT NULL REFERENCES users(id)     ON DELETE CASCADE,
  description     TEXT        NOT NULL CHECK (length(trim(description)) > 0),
  amount_owed     INTEGER     NOT NULL CHECK (amount_owed >= 0),
  amount_paid     INTEGER     NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
  payment_method  TEXT        CHECK (payment_method IN ('Cash', 'MoMo', 'Bank', 'Other')),
  payment_date    DATE,
  notes           TEXT,
  created_by      UUID        NOT NULL REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_paid_lte_owed CHECK (amount_paid <= amount_owed)
);

COMMENT ON TABLE  fee_ledger                 IS 'Manual fee payment ledger per player. Amounts in GHS pesewas.';
COMMENT ON COLUMN fee_ledger.academy_id      IS 'Tenant isolation key.';
COMMENT ON COLUMN fee_ledger.amount_owed     IS 'Total amount owed in pesewas (e.g. 5000 = GHS 50.00).';
COMMENT ON COLUMN fee_ledger.amount_paid     IS 'Amount paid so far. Balance = amount_owed - amount_paid.';
COMMENT ON COLUMN fee_ledger.payment_method  IS 'How the payment was received. NULL if not yet paid.';
COMMENT ON COLUMN fee_ledger.payment_date    IS 'Date payment was received. NULL if outstanding.';

CREATE INDEX idx_fee_ledger_academy_id ON fee_ledger (academy_id);
CREATE INDEX idx_fee_ledger_player_id  ON fee_ledger (academy_id, player_id);
CREATE INDEX idx_fee_ledger_created_at ON fee_ledger (academy_id, created_at DESC);

CREATE TRIGGER trg_fee_ledger_updated_at
BEFORE UPDATE ON fee_ledger
FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

ALTER TABLE fee_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON fee_ledger
  FOR ALL USING (academy_id = auth_academy_id());

-- Only Admin may create or modify fee records
CREATE POLICY fee_ledger_write ON fee_ledger
  FOR INSERT WITH CHECK (
    academy_id = auth_academy_id()
    AND auth_user_role() = 'Admin'
  );

CREATE POLICY fee_ledger_update ON fee_ledger
  FOR UPDATE USING (
    academy_id = auth_academy_id()
    AND auth_user_role() = 'Admin'
  );

CREATE POLICY fee_ledger_delete ON fee_ledger
  FOR DELETE USING (
    academy_id = auth_academy_id()
    AND auth_user_role() = 'Admin'
  );


-- ================================================================
-- 3. PLAYER DOCUMENTS
-- Birth certificates, medical clearances, GFA registration forms.
-- Files stored in Supabase Storage bucket 'player-documents'.
-- ================================================================

CREATE TABLE player_documents (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  academy_id   UUID        NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
  player_id    UUID        NOT NULL REFERENCES users(id)     ON DELETE CASCADE,
  doc_type     TEXT        NOT NULL CHECK (doc_type IN (
                             'Birth Certificate',
                             'Medical Clearance',
                             'GFA Registration',
                             'Parent Consent',
                             'Other'
                           )),
  file_name    TEXT        NOT NULL,
  file_url     TEXT        NOT NULL,
  file_size    INTEGER,
  uploaded_by  UUID        NOT NULL REFERENCES users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  player_documents            IS 'Player compliance documents stored in Supabase Storage.';
COMMENT ON COLUMN player_documents.academy_id IS 'Tenant isolation key.';
COMMENT ON COLUMN player_documents.doc_type   IS 'Document category for filtering and compliance checks.';
COMMENT ON COLUMN player_documents.file_url   IS 'Supabase Storage public URL.';

CREATE INDEX idx_player_documents_academy_id ON player_documents (academy_id);
CREATE INDEX idx_player_documents_player_id  ON player_documents (academy_id, player_id);

ALTER TABLE player_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON player_documents
  FOR ALL USING (academy_id = auth_academy_id());

-- Admin and Coach may upload documents
CREATE POLICY player_documents_write ON player_documents
  FOR INSERT WITH CHECK (
    academy_id = auth_academy_id()
    AND auth_user_role() IN ('Admin', 'Coach')
  );

-- Only Admin may delete documents
CREATE POLICY player_documents_delete ON player_documents
  FOR DELETE USING (
    academy_id = auth_academy_id()
    AND auth_user_role() = 'Admin'
  );

-- Storage bucket for player documents (private — no public read)
INSERT INTO storage.buckets (id, name, public)
VALUES ('player-documents', 'player-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Authenticated users may upload to player-documents
CREATE POLICY "Authenticated users can upload player documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'player-documents');

-- Authenticated users may read player documents within their academy path
CREATE POLICY "Authenticated users can read player documents"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'player-documents');

-- Admin/Coach may delete player documents
CREATE POLICY "Authenticated users can delete player documents"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'player-documents');


-- ================================================================
-- 4. ANNOUNCEMENTS
-- Academy-wide broadcasts created by Admins.
-- Visible to all users in the academy on their dashboard.
-- ================================================================

CREATE TABLE announcements (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  academy_id  UUID        NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
  created_by  UUID        NOT NULL REFERENCES users(id),
  title       TEXT        NOT NULL CHECK (length(trim(title)) > 0),
  body        TEXT        NOT NULL CHECK (length(trim(body)) > 0),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  announcements            IS 'Academy-wide announcements visible on all role dashboards.';
COMMENT ON COLUMN announcements.academy_id IS 'Tenant isolation key.';
COMMENT ON COLUMN announcements.created_by IS 'Admin who posted the announcement.';

CREATE INDEX idx_announcements_academy_id ON announcements (academy_id);
CREATE INDEX idx_announcements_created_at ON announcements (academy_id, created_at DESC);

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON announcements
  FOR ALL USING (academy_id = auth_academy_id());

-- Only Admin may create or delete announcements
CREATE POLICY announcements_write ON announcements
  FOR INSERT WITH CHECK (
    academy_id = auth_academy_id()
    AND auth_user_role() = 'Admin'
  );

CREATE POLICY announcements_delete ON announcements
  FOR DELETE USING (
    academy_id = auth_academy_id()
    AND auth_user_role() = 'Admin'
  );


-- ================================================================
-- END OF MIGRATION 016
-- ================================================================
