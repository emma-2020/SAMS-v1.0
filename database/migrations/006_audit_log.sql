-- 006_audit_log.sql
-- Immutable audit trail for security-relevant events across the platform.
-- Rows are INSERT-only — no UPDATE or DELETE permitted via RLS.

CREATE TABLE IF NOT EXISTS audit_logs (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id   uuid        REFERENCES academies(id) ON DELETE SET NULL,
  actor_id     uuid,                          -- users.id (null for unauthenticated events)
  actor_email  text,
  actor_role   text,
  event        text        NOT NULL,          -- e.g. 'auth.login', 'auth.login_failed'
  resource     text,                          -- e.g. 'users', 'teams'
  resource_id  text,                          -- ID of the affected row
  meta         jsonb       DEFAULT '{}',      -- extra context (ip, user_agent, etc.)
  ip_address   inet,
  created_at   timestamptz DEFAULT now() NOT NULL
);

-- Index for per-academy audit queries (admin dashboard)
CREATE INDEX IF NOT EXISTS audit_logs_academy_idx  ON audit_logs (academy_id, created_at DESC);
-- Index for per-actor queries
CREATE INDEX IF NOT EXISTS audit_logs_actor_idx    ON audit_logs (actor_id,   created_at DESC);
-- Index for event-type queries
CREATE INDEX IF NOT EXISTS audit_logs_event_idx    ON audit_logs (event,      created_at DESC);

-- RLS: enable row-level security
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Admins can read audit logs for their own academy only
CREATE POLICY "Admins read own academy audit logs"
  ON audit_logs FOR SELECT
  USING (academy_id = (auth.jwt() ->> 'academy_id')::uuid AND (auth.jwt() ->> 'role') = 'Admin');

-- No one can update or delete audit log rows (immutability enforced at DB level)
-- Inserts are done via supabaseAdmin (service-role) which bypasses RLS.
