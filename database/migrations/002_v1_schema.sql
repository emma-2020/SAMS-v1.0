-- ================================================================
-- SAMS v1.0  —  Base Model Schema Migration
-- Database   : Supabase (PostgreSQL)
-- Run this   : FIRST, in a fresh Supabase project SQL Editor
-- ================================================================
--
-- Tables created:
--   academies · users · teams · rosters · events ·
--   attendance · health_logs · messages · invitations
--
-- Every table except `academies` carries academy_id for tenant
-- isolation. RLS policies enforce this at the database layer.
-- ================================================================


-- ----------------------------------------------------------------
-- EXTENSIONS
-- ----------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";   -- uuid_generate_v4()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";    -- gen_random_bytes()


-- ================================================================
-- 1. ACADEMIES
-- Tenant root. No academy_id here — this IS the tenant anchor.
-- is_active lets an academy be suspended without deleting data.
-- ================================================================
CREATE TABLE academies (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         TEXT        NOT NULL,
  is_active    BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  academies           IS 'Root tenant record. One row per sports academy.';
COMMENT ON COLUMN academies.is_active IS 'FALSE = suspended. extractTenant middleware blocks access.';


-- ================================================================
-- 2. USERS
-- All four roles share one table. first_name/last_name/is_active
-- are required by the auth middleware and services.
-- ================================================================
CREATE TABLE users (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  academy_id    UUID        NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
  email         TEXT        NOT NULL,
  password_hash TEXT        NOT NULL DEFAULT 'managed_by_supabase_auth',
  role          TEXT        NOT NULL CHECK (role IN ('Admin', 'Coach', 'Player', 'Parent')),
  first_name    TEXT        NOT NULL DEFAULT '',
  last_name     TEXT        NOT NULL DEFAULT '',
  is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Global email uniqueness enforced in auth.service.js;
  -- this constraint catches duplicates within the same academy.
  CONSTRAINT uq_users_email_per_academy UNIQUE (academy_id, email)
);

COMMENT ON TABLE  users              IS 'All platform users across all roles within a tenant.';
COMMENT ON COLUMN users.academy_id   IS 'Tenant isolation key.';
COMMENT ON COLUMN users.role         IS 'Exactly one of: Admin, Coach, Player, Parent.';
COMMENT ON COLUMN users.is_active    IS 'FALSE = deactivated by admin. Auth middleware rejects login.';

CREATE INDEX idx_users_academy_id ON users (academy_id);
CREATE INDEX idx_users_role       ON users (academy_id, role);
CREATE INDEX idx_users_email      ON users (academy_id, email);


-- ================================================================
-- 3. TEAMS
-- division and sport are used in schedule API responses.
-- ================================================================
CREATE TABLE teams (
  id          UUID  PRIMARY KEY DEFAULT uuid_generate_v4(),
  academy_id  UUID  NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
  name        TEXT  NOT NULL,
  coach_id    UUID  REFERENCES users(id) ON DELETE SET NULL,
  division    TEXT,
  sport       TEXT,

  CONSTRAINT uq_team_name_per_academy UNIQUE (academy_id, name)
);

COMMENT ON TABLE  teams            IS 'Team divisions within an academy.';
COMMENT ON COLUMN teams.academy_id IS 'Tenant isolation key.';
COMMENT ON COLUMN teams.coach_id   IS 'Head coach. Nullable until assigned.';
COMMENT ON COLUMN teams.division   IS 'e.g. U16, Senior, Women''s.';
COMMENT ON COLUMN teams.sport      IS 'e.g. Football, Basketball.';

CREATE INDEX idx_teams_academy_id ON teams (academy_id);
CREATE INDEX idx_teams_coach_id   ON teams (coach_id);


-- ================================================================
-- 4. ROSTERS
-- Links players (and their optional parent) to a team.
-- ================================================================
CREATE TABLE rosters (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  academy_id  UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
  team_id     UUID NOT NULL REFERENCES teams(id)     ON DELETE CASCADE,
  player_id   UUID NOT NULL REFERENCES users(id)     ON DELETE CASCADE,
  parent_id   UUID          REFERENCES users(id)     ON DELETE SET NULL,

  CONSTRAINT uq_roster_player_per_team UNIQUE (team_id, player_id)
);

COMMENT ON TABLE  rosters            IS 'Player–team membership with optional parent link.';
COMMENT ON COLUMN rosters.academy_id IS 'Tenant isolation key.';
COMMENT ON COLUMN rosters.parent_id  IS 'FK to users where role = Parent. Optional.';

CREATE INDEX idx_rosters_academy_id ON rosters (academy_id);
CREATE INDEX idx_rosters_team_id    ON rosters (team_id);
CREATE INDEX idx_rosters_player_id  ON rosters (player_id);
CREATE INDEX idx_rosters_parent_id  ON rosters (parent_id);


-- ================================================================
-- 5. EVENTS
-- Scheduled practices and games.
-- created_by is used by the schedule service insert.
-- ================================================================
CREATE TABLE events (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  academy_id  UUID        NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
  team_id     UUID        NOT NULL REFERENCES teams(id)     ON DELETE CASCADE,
  created_by  UUID                 REFERENCES users(id)     ON DELETE SET NULL,
  title       TEXT        NOT NULL,
  description TEXT,
  type        TEXT        NOT NULL CHECK (type IN ('Practice', 'Game')),
  location    TEXT,
  start_time  TIMESTAMPTZ NOT NULL,
  end_time    TIMESTAMPTZ NOT NULL,

  CONSTRAINT chk_event_end_after_start CHECK (end_time > start_time)
);

COMMENT ON TABLE  events            IS 'Scheduled practices and games per team.';
COMMENT ON COLUMN events.academy_id IS 'Tenant isolation key.';
COMMENT ON COLUMN events.created_by IS 'Coach or Admin who created this event.';

CREATE INDEX idx_events_academy_id  ON events (academy_id);
CREATE INDEX idx_events_team_id     ON events (team_id);
CREATE INDEX idx_events_start_time  ON events (academy_id, start_time);
CREATE INDEX idx_events_type        ON events (academy_id, type);


-- ================================================================
-- 6. ATTENDANCE
-- Coach tap-list per event.
-- logged_by and notes are set by the attendance service upsert.
-- ================================================================
CREATE TABLE attendance (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  academy_id  UUID        NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
  event_id    UUID        NOT NULL REFERENCES events(id)    ON DELETE CASCADE,
  player_id   UUID        NOT NULL REFERENCES users(id)     ON DELETE CASCADE,
  logged_by   UUID                 REFERENCES users(id)     ON DELETE SET NULL,
  status      TEXT        NOT NULL CHECK (status IN ('Present', 'Absent', 'Injured')),
  notes       TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_attendance_player_event UNIQUE (event_id, player_id)
);

COMMENT ON TABLE  attendance            IS 'Per-player attendance status for each event.';
COMMENT ON COLUMN attendance.academy_id IS 'Tenant isolation key.';
COMMENT ON COLUMN attendance.logged_by  IS 'Coach who submitted this record.';
COMMENT ON COLUMN attendance.notes      IS 'Optional coach note (e.g. reason for absence).';

CREATE INDEX idx_attendance_academy_id ON attendance (academy_id);
CREATE INDEX idx_attendance_event_id   ON attendance (event_id);
CREATE INDEX idx_attendance_player_id  ON attendance (player_id);
CREATE INDEX idx_attendance_status     ON attendance (academy_id, status);

-- Auto-stamp updated_at on every status change
CREATE OR REPLACE FUNCTION fn_attendance_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_attendance_updated_at
BEFORE UPDATE ON attendance
FOR EACH ROW EXECUTE FUNCTION fn_attendance_updated_at();


-- ================================================================
-- 7. HEALTH LOGS
-- Player daily 3-metric check-in.
--
-- IMPORTANT: The unique "one log per player per day" rule is
-- enforced by the plain log_date DATE column — NOT by a
-- function-based expression. PostgreSQL requires functions used
-- in index expressions to be IMMUTABLE; TIMESTAMPTZ::DATE is
-- only STABLE (timezone-dependent), which causes error 42P17.
-- Using a dedicated DATE column avoids this entirely.
-- ================================================================
CREATE TABLE health_logs (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  academy_id    UUID        NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
  player_id     UUID        NOT NULL REFERENCES users(id)     ON DELETE CASCADE,
  fatigue       SMALLINT    NOT NULL CHECK (fatigue       BETWEEN 1 AND 5),
  soreness      SMALLINT    NOT NULL CHECK (soreness      BETWEEN 1 AND 5),
  sleep_quality SMALLINT    NOT NULL CHECK (sleep_quality BETWEEN 1 AND 5),
  notes         TEXT,
  log_date      DATE        NOT NULL DEFAULT CURRENT_DATE,
  logged_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Plain columns only — no expressions, no function casts
  CONSTRAINT uq_health_log_player_day UNIQUE (player_id, log_date)
);

COMMENT ON TABLE  health_logs               IS 'Daily player wellness check-in.';
COMMENT ON COLUMN health_logs.academy_id    IS 'Tenant isolation key.';
COMMENT ON COLUMN health_logs.log_date      IS 'Calendar date of submission. Enforces one log per day.';
COMMENT ON COLUMN health_logs.fatigue       IS '1 = fully rested, 5 = exhausted.';
COMMENT ON COLUMN health_logs.soreness      IS '1 = no soreness, 5 = severe.';
COMMENT ON COLUMN health_logs.sleep_quality IS '1 = poor, 5 = excellent.';

CREATE INDEX idx_health_logs_academy_id ON health_logs (academy_id);
CREATE INDEX idx_health_logs_player_id  ON health_logs (player_id);
CREATE INDEX idx_health_logs_log_date   ON health_logs (academy_id, log_date DESC);

-- Auto-flag high-risk submissions for the Parent Portal
CREATE OR REPLACE FUNCTION fn_health_flag_check()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.fatigue >= 4 OR NEW.soreness >= 4 OR NEW.sleep_quality <= 2 THEN
    NEW.is_flagged = TRUE;
  ELSE
    NEW.is_flagged = FALSE;
  END IF;
  RETURN NEW;
END;
$$;

-- is_flagged column consumed by Parent Portal and health alerts
ALTER TABLE health_logs
  ADD COLUMN is_flagged BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN health_logs.is_flagged IS
  'Set automatically by trigger. TRUE when any score breaches alert threshold.';

CREATE INDEX idx_health_logs_flagged
  ON health_logs (academy_id, player_id)
  WHERE is_flagged = TRUE;

CREATE TRIGGER trg_health_flag_check
BEFORE INSERT OR UPDATE ON health_logs
FOR EACH ROW EXECUTE FUNCTION fn_health_flag_check();


-- ================================================================
-- 8. MESSAGES
-- Text-only team channel. V1.0 scope.
-- ================================================================
CREATE TABLE messages (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  academy_id   UUID        NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
  team_id      UUID        NOT NULL REFERENCES teams(id)     ON DELETE CASCADE,
  sender_id    UUID        NOT NULL REFERENCES users(id)     ON DELETE CASCADE,
  message_text TEXT        NOT NULL CHECK (length(trim(message_text)) > 0),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  messages            IS 'Text-only team group chat messages.';
COMMENT ON COLUMN messages.academy_id IS 'Tenant isolation key.';

CREATE INDEX idx_messages_academy_id ON messages (academy_id);
CREATE INDEX idx_messages_team_id    ON messages (team_id);
CREATE INDEX idx_messages_sender_id  ON messages (sender_id);
CREATE INDEX idx_messages_created_at ON messages (team_id, created_at DESC);


-- ================================================================
-- 9. INVITATIONS
-- Admin invite provisioner. token is a 64-char hex string used
-- in the registration link. Never returned in API responses.
-- ================================================================
CREATE TABLE invitations (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  academy_id  UUID        NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
  invited_by  UUID        NOT NULL REFERENCES users(id),
  email       TEXT        NOT NULL,
  role        TEXT        NOT NULL CHECK (role IN ('Coach', 'Player', 'Parent')),
  first_name  TEXT        NOT NULL DEFAULT '',
  last_name   TEXT        NOT NULL DEFAULT '',
  token       TEXT        NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  accepted_at TIMESTAMPTZ,
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '72 hours'),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  invitations            IS 'Pending academy membership invitations.';
COMMENT ON COLUMN invitations.academy_id IS 'Tenant isolation key.';
COMMENT ON COLUMN invitations.token      IS 'Secure random token embedded in registration link.';

CREATE INDEX idx_invitations_academy_id ON invitations (academy_id);
CREATE INDEX idx_invitations_email      ON invitations (academy_id, email);
CREATE INDEX idx_invitations_token      ON invitations (token);


-- ================================================================
-- RLS HELPER FUNCTIONS
-- ================================================================

CREATE OR REPLACE FUNCTION auth_academy_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT academy_id FROM users WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION auth_user_role()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role FROM users WHERE id = auth.uid() LIMIT 1;
$$;


-- ================================================================
-- ENABLE ROW LEVEL SECURITY
-- ================================================================

ALTER TABLE users        ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams        ENABLE ROW LEVEL SECURITY;
ALTER TABLE rosters      ENABLE ROW LEVEL SECURITY;
ALTER TABLE events       ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance   ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_logs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages     ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations  ENABLE ROW LEVEL SECURITY;


-- ================================================================
-- TENANT ISOLATION POLICIES  (all tables, every operation)
-- ================================================================

CREATE POLICY tenant_isolation ON users
  FOR ALL USING (academy_id = auth_academy_id());

CREATE POLICY tenant_isolation ON teams
  FOR ALL USING (academy_id = auth_academy_id());

CREATE POLICY tenant_isolation ON rosters
  FOR ALL USING (academy_id = auth_academy_id());

CREATE POLICY tenant_isolation ON events
  FOR ALL USING (academy_id = auth_academy_id());

CREATE POLICY tenant_isolation ON attendance
  FOR ALL USING (academy_id = auth_academy_id());

CREATE POLICY tenant_isolation ON health_logs
  FOR ALL USING (academy_id = auth_academy_id());

CREATE POLICY tenant_isolation ON messages
  FOR ALL USING (academy_id = auth_academy_id());

CREATE POLICY tenant_isolation ON invitations
  FOR ALL USING (academy_id = auth_academy_id());


-- ================================================================
-- ROLE-BASED WRITE POLICIES
-- ================================================================

-- Attendance: Admin and Coach only
CREATE POLICY attendance_write ON attendance
  FOR INSERT WITH CHECK (
    academy_id = auth_academy_id()
    AND auth_user_role() IN ('Admin', 'Coach')
  );

CREATE POLICY attendance_update ON attendance
  FOR UPDATE USING (
    academy_id = auth_academy_id()
    AND auth_user_role() IN ('Admin', 'Coach')
  );

-- Health logs: Players write only their own records
CREATE POLICY health_log_write ON health_logs
  FOR INSERT WITH CHECK (
    academy_id = auth_academy_id()
    AND player_id = auth.uid()
    AND auth_user_role() = 'Player'
  );

-- Messages: any authenticated team member
CREATE POLICY messages_write ON messages
  FOR INSERT WITH CHECK (
    academy_id = auth_academy_id()
    AND sender_id = auth.uid()
  );

-- Events: Admin and Coach only
CREATE POLICY events_write ON events
  FOR INSERT WITH CHECK (
    academy_id = auth_academy_id()
    AND auth_user_role() IN ('Admin', 'Coach')
  );

CREATE POLICY events_update ON events
  FOR UPDATE USING (
    academy_id = auth_academy_id()
    AND auth_user_role() IN ('Admin', 'Coach')
  );

-- Invitations: Admin only
CREATE POLICY invitations_write ON invitations
  FOR INSERT WITH CHECK (
    academy_id = auth_academy_id()
    AND auth_user_role() = 'Admin'
  );


-- ================================================================
-- END OF MIGRATION 002
-- ================================================================
