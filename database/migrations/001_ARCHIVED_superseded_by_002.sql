-- =============================================================
-- ARCHIVED — DO NOT APPLY TO ANY ENVIRONMENT
-- This migration has been superseded by 002_v1_schema.sql.
-- Applying this file will create duplicate conflicting tables
-- (user_profiles, sessions, team_members, chat_messages) and
-- overwrite RLS helper functions, breaking tenant isolation.
-- The canonical schema is: 002_v1_schema.sql
-- =============================================================

-- =============================================================
-- SAMS v1.0 — Master Database Migration
-- Supabase / PostgreSQL
-- All operational tables include academy_id (multi-tenancy mandate)
-- RLS (Row Level Security) enabled on every table
-- =============================================================

-- -------------------------------------------------------
-- EXTENSIONS
-- -------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- =============================================================
-- CORE IDENTITY LAYER
-- =============================================================

-- -------------------------------------------------------
-- ACADEMIES (tenant root — no academy_id needed here)
-- -------------------------------------------------------
CREATE TABLE academies (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  slug          TEXT NOT NULL UNIQUE,          -- URL-safe tenant identifier
  contact_email TEXT NOT NULL,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------
-- USER PROFILES (extends Supabase auth.users)
-- -------------------------------------------------------
CREATE TABLE user_profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  academy_id    UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
  role          TEXT NOT NULL CHECK (role IN ('player','coach','parent','admin')),
  first_name    TEXT NOT NULL,
  last_name     TEXT NOT NULL,
  phone         TEXT,
  avatar_url    TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_profiles_academy ON user_profiles(academy_id);
CREATE INDEX idx_user_profiles_role    ON user_profiles(role);

-- -------------------------------------------------------
-- PENDING INVITATIONS (admin invite provisioner)
-- -------------------------------------------------------
CREATE TABLE invitations (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  academy_id    UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
  invited_by    UUID NOT NULL REFERENCES user_profiles(id),
  email         TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('player','coach','parent')),
  token         TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  accepted_at   TIMESTAMPTZ,
  expires_at    TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invitations_academy ON invitations(academy_id);
CREATE INDEX idx_invitations_token   ON invitations(token);


-- =============================================================
-- TEAM & ROSTER LAYER
-- =============================================================

-- -------------------------------------------------------
-- TEAMS / DIVISIONS
-- -------------------------------------------------------
CREATE TABLE teams (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  academy_id    UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  division      TEXT,                          -- e.g. U12, Senior, Women's
  sport         TEXT NOT NULL,
  head_coach_id UUID REFERENCES user_profiles(id),
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_teams_academy ON teams(academy_id);

-- -------------------------------------------------------
-- TEAM MEMBERS (players + coaches mapped to teams)
-- -------------------------------------------------------
CREATE TABLE team_members (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  academy_id    UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
  team_id       UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  member_role   TEXT NOT NULL CHECK (member_role IN ('player','coach','assistant_coach')),
  position      TEXT,                          -- playing position label
  jersey_number TEXT,
  joined_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (team_id, user_id)
);

CREATE INDEX idx_team_members_academy ON team_members(academy_id);
CREATE INDEX idx_team_members_team    ON team_members(team_id);
CREATE INDEX idx_team_members_user    ON team_members(user_id);

-- -------------------------------------------------------
-- PARENT–PLAYER LINKS
-- -------------------------------------------------------
CREATE TABLE parent_player_links (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  academy_id    UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
  parent_id     UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  player_id     UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  relationship  TEXT DEFAULT 'guardian',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (parent_id, player_id)
);

CREATE INDEX idx_parent_player_academy ON parent_player_links(academy_id);
CREATE INDEX idx_parent_player_parent  ON parent_player_links(parent_id);
CREATE INDEX idx_parent_player_player  ON parent_player_links(player_id);

-- -------------------------------------------------------
-- PLAYER PROFILES (extended detail — per player, per academy)
-- -------------------------------------------------------
CREATE TABLE player_details (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  academy_id            UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
  user_id               UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE UNIQUE,
  date_of_birth         DATE,
  emergency_contact_name  TEXT,
  emergency_contact_phone TEXT,
  medical_notes         TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_player_details_academy ON player_details(academy_id);


-- =============================================================
-- SCHEDULING LAYER
-- =============================================================

-- -------------------------------------------------------
-- VENUES / RESOURCES (fields, gyms, courts)
-- -------------------------------------------------------
CREATE TABLE venues (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  academy_id    UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  type          TEXT NOT NULL CHECK (type IN ('field','gym','court','pool','other')),
  location_notes TEXT,
  capacity      INT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_venues_academy ON venues(academy_id);

-- -------------------------------------------------------
-- SESSIONS (practice / match / event)
-- -------------------------------------------------------
CREATE TABLE sessions (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  academy_id     UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
  team_id        UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  venue_id       UUID REFERENCES venues(id),
  created_by     UUID NOT NULL REFERENCES user_profiles(id),
  title          TEXT NOT NULL,
  session_type   TEXT NOT NULL CHECK (session_type IN ('practice','match','meeting','other')),
  starts_at      TIMESTAMPTZ NOT NULL,
  ends_at        TIMESTAMPTZ NOT NULL,
  notes          TEXT,
  is_cancelled   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (ends_at > starts_at)
);

CREATE INDEX idx_sessions_academy   ON sessions(academy_id);
CREATE INDEX idx_sessions_team      ON sessions(team_id);
CREATE INDEX idx_sessions_starts_at ON sessions(starts_at);
CREATE INDEX idx_sessions_venue     ON sessions(venue_id);

-- -------------------------------------------------------
-- VENUE RESOURCE BLOCKS (admin field conflict allocator)
-- Standalone blocks independent of sessions (reserved slots)
-- -------------------------------------------------------
CREATE TABLE venue_blocks (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  academy_id    UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
  venue_id      UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  reserved_by   UUID NOT NULL REFERENCES user_profiles(id),
  label         TEXT NOT NULL,
  starts_at     TIMESTAMPTZ NOT NULL,
  ends_at       TIMESTAMPTZ NOT NULL,
  session_id    UUID REFERENCES sessions(id),  -- optional link
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (ends_at > starts_at)
);

CREATE INDEX idx_venue_blocks_academy  ON venue_blocks(academy_id);
CREATE INDEX idx_venue_blocks_venue    ON venue_blocks(venue_id);
CREATE INDEX idx_venue_blocks_starts   ON venue_blocks(starts_at);


-- =============================================================
-- ATTENDANCE LAYER
-- =============================================================

-- -------------------------------------------------------
-- ATTENDANCE RECORDS (coach tap-list per session)
-- -------------------------------------------------------
CREATE TABLE attendance (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  academy_id    UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
  session_id    UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  player_id     UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  logged_by     UUID NOT NULL REFERENCES user_profiles(id),
  status        TEXT NOT NULL CHECK (status IN ('present','absent','injured')),
  notes         TEXT,
  logged_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (session_id, player_id)
);

CREATE INDEX idx_attendance_academy   ON attendance(academy_id);
CREATE INDEX idx_attendance_session   ON attendance(session_id);
CREATE INDEX idx_attendance_player    ON attendance(player_id);


-- =============================================================
-- WORKOUT & TRAINING LAYER
-- =============================================================

-- -------------------------------------------------------
-- SESSION BLUEPRINTS (practice plan creator)
-- -------------------------------------------------------
CREATE TABLE session_blueprints (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  academy_id    UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
  session_id    UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  created_by    UUID NOT NULL REFERENCES user_profiles(id),
  title         TEXT NOT NULL,
  overview      TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_blueprints_academy ON session_blueprints(academy_id);
CREATE INDEX idx_blueprints_session ON session_blueprints(session_id);

-- -------------------------------------------------------
-- BLUEPRINT DRILLS (ordered steps within a blueprint)
-- -------------------------------------------------------
CREATE TABLE blueprint_drills (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  academy_id      UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
  blueprint_id    UUID NOT NULL REFERENCES session_blueprints(id) ON DELETE CASCADE,
  sort_order      INT NOT NULL DEFAULT 0,
  title           TEXT NOT NULL,
  instructions    TEXT,
  duration_minutes INT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_blueprint_drills_academy    ON blueprint_drills(academy_id);
CREATE INDEX idx_blueprint_drills_blueprint  ON blueprint_drills(blueprint_id);

-- -------------------------------------------------------
-- WORKOUT ASSIGNMENTS (coach assigns routines to players)
-- -------------------------------------------------------
CREATE TABLE workout_assignments (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  academy_id    UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
  team_id       UUID REFERENCES teams(id),
  player_id     UUID REFERENCES user_profiles(id),  -- NULL = whole team
  assigned_by   UUID NOT NULL REFERENCES user_profiles(id),
  title         TEXT NOT NULL,
  due_date      DATE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (team_id IS NOT NULL OR player_id IS NOT NULL)
);

CREATE INDEX idx_workout_assignments_academy ON workout_assignments(academy_id);

-- -------------------------------------------------------
-- WORKOUT EXERCISES (items within an assignment)
-- -------------------------------------------------------
CREATE TABLE workout_exercises (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  academy_id        UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
  assignment_id     UUID NOT NULL REFERENCES workout_assignments(id) ON DELETE CASCADE,
  sort_order        INT NOT NULL DEFAULT 0,
  description       TEXT NOT NULL,
  sets_reps_notes   TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_workout_exercises_academy    ON workout_exercises(academy_id);
CREATE INDEX idx_workout_exercises_assignment ON workout_exercises(assignment_id);

-- -------------------------------------------------------
-- WORKOUT COMPLETION LOGS (player checkbox submissions)
-- -------------------------------------------------------
CREATE TABLE workout_completions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  academy_id      UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
  exercise_id     UUID NOT NULL REFERENCES workout_exercises(id) ON DELETE CASCADE,
  player_id       UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  is_completed    BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (exercise_id, player_id)
);

CREATE INDEX idx_workout_completions_academy ON workout_completions(academy_id);
CREATE INDEX idx_workout_completions_player  ON workout_completions(player_id);


-- =============================================================
-- HEALTH CHECK-IN LAYER
-- =============================================================

-- -------------------------------------------------------
-- HEALTH LOGS (player daily 3-metric slider submissions)
-- Fatigue: 1–5, Soreness: 1–5, Sleep Quality: 1–5
-- -------------------------------------------------------
CREATE TABLE health_logs (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  academy_id        UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
  player_id         UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  log_date          DATE NOT NULL DEFAULT CURRENT_DATE,
  fatigue_score     SMALLINT NOT NULL CHECK (fatigue_score BETWEEN 1 AND 5),
  soreness_score    SMALLINT NOT NULL CHECK (soreness_score BETWEEN 1 AND 5),
  sleep_score       SMALLINT NOT NULL CHECK (sleep_score BETWEEN 1 AND 5),
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (player_id, log_date)     -- one submission per player per day
);

CREATE INDEX idx_health_logs_academy    ON health_logs(academy_id);
CREATE INDEX idx_health_logs_player     ON health_logs(player_id);
CREATE INDEX idx_health_logs_date       ON health_logs(log_date);

-- -------------------------------------------------------
-- HEALTH ALERT FLAGS (auto-flagged high scores / injuries)
-- Consumed by the Parent Portal health indicators
-- -------------------------------------------------------
CREATE TABLE health_alert_flags (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  academy_id      UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
  player_id       UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  health_log_id   UUID REFERENCES health_logs(id),
  attendance_id   UUID REFERENCES attendance(id),   -- injury flag source
  flag_type       TEXT NOT NULL CHECK (flag_type IN ('high_fatigue','high_soreness','poor_sleep','injury_logged')),
  flag_value      TEXT,
  is_resolved     BOOLEAN NOT NULL DEFAULT FALSE,
  resolved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_health_flags_academy ON health_alert_flags(academy_id);
CREATE INDEX idx_health_flags_player  ON health_alert_flags(player_id);


-- =============================================================
-- MESSAGING / CHAT LAYER
-- =============================================================

-- -------------------------------------------------------
-- CHAT CHANNELS
-- channel_type: 'team'   → team group chat (players + coaches)
--               'direct' → parent–coach direct line
-- -------------------------------------------------------
CREATE TABLE chat_channels (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  academy_id    UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
  channel_type  TEXT NOT NULL CHECK (channel_type IN ('team','direct')),
  team_id       UUID REFERENCES teams(id),          -- set for team channels
  name          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chat_channels_academy ON chat_channels(academy_id);
CREATE INDEX idx_chat_channels_team    ON chat_channels(team_id);

-- -------------------------------------------------------
-- CHANNEL MEMBERS
-- -------------------------------------------------------
CREATE TABLE channel_members (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  academy_id    UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
  channel_id    UUID NOT NULL REFERENCES chat_channels(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  joined_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (channel_id, user_id)
);

CREATE INDEX idx_channel_members_academy  ON channel_members(academy_id);
CREATE INDEX idx_channel_members_channel  ON channel_members(channel_id);
CREATE INDEX idx_channel_members_user     ON channel_members(user_id);

-- -------------------------------------------------------
-- CHAT MESSAGES (text only — V1.0)
-- -------------------------------------------------------
CREATE TABLE chat_messages (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  academy_id    UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
  channel_id    UUID NOT NULL REFERENCES chat_channels(id) ON DELETE CASCADE,
  sender_id     UUID NOT NULL REFERENCES user_profiles(id),
  body          TEXT NOT NULL CHECK (length(trim(body)) > 0),
  is_deleted    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chat_messages_academy   ON chat_messages(academy_id);
CREATE INDEX idx_chat_messages_channel   ON chat_messages(channel_id);
CREATE INDEX idx_chat_messages_created   ON chat_messages(created_at);


-- =============================================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================================

ALTER TABLE academies             ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations           ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members          ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_player_links   ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_details        ENABLE ROW LEVEL SECURITY;
ALTER TABLE venues                ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions              ENABLE ROW LEVEL SECURITY;
ALTER TABLE venue_blocks          ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance            ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_blueprints    ENABLE ROW LEVEL SECURITY;
ALTER TABLE blueprint_drills      ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_assignments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_exercises     ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_completions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_logs           ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_alert_flags    ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_channels         ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_members       ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages         ENABLE ROW LEVEL SECURITY;

-- Helper: get calling user's academy_id from user_profiles
CREATE OR REPLACE FUNCTION auth_academy_id()
RETURNS UUID LANGUAGE sql STABLE AS $$
  SELECT academy_id FROM user_profiles WHERE id = auth.uid();
$$;

-- Helper: get calling user's role
CREATE OR REPLACE FUNCTION auth_role()
RETURNS TEXT LANGUAGE sql STABLE AS $$
  SELECT role FROM user_profiles WHERE id = auth.uid();
$$;

-- -------------------------------------------------------
-- TENANT ISOLATION — applied to every table
-- Users only see rows belonging to their own academy
-- -------------------------------------------------------

CREATE POLICY tenant_isolation ON user_profiles
  USING (academy_id = auth_academy_id());

CREATE POLICY tenant_isolation ON invitations
  USING (academy_id = auth_academy_id());

CREATE POLICY tenant_isolation ON teams
  USING (academy_id = auth_academy_id());

CREATE POLICY tenant_isolation ON team_members
  USING (academy_id = auth_academy_id());

CREATE POLICY tenant_isolation ON parent_player_links
  USING (academy_id = auth_academy_id());

CREATE POLICY tenant_isolation ON player_details
  USING (academy_id = auth_academy_id());

CREATE POLICY tenant_isolation ON venues
  USING (academy_id = auth_academy_id());

CREATE POLICY tenant_isolation ON sessions
  USING (academy_id = auth_academy_id());

CREATE POLICY tenant_isolation ON venue_blocks
  USING (academy_id = auth_academy_id());

CREATE POLICY tenant_isolation ON attendance
  USING (academy_id = auth_academy_id());

CREATE POLICY tenant_isolation ON session_blueprints
  USING (academy_id = auth_academy_id());

CREATE POLICY tenant_isolation ON blueprint_drills
  USING (academy_id = auth_academy_id());

CREATE POLICY tenant_isolation ON workout_assignments
  USING (academy_id = auth_academy_id());

CREATE POLICY tenant_isolation ON workout_exercises
  USING (academy_id = auth_academy_id());

CREATE POLICY tenant_isolation ON workout_completions
  USING (academy_id = auth_academy_id());

CREATE POLICY tenant_isolation ON health_logs
  USING (academy_id = auth_academy_id());

CREATE POLICY tenant_isolation ON health_alert_flags
  USING (academy_id = auth_academy_id());

CREATE POLICY tenant_isolation ON chat_channels
  USING (academy_id = auth_academy_id());

CREATE POLICY tenant_isolation ON channel_members
  USING (academy_id = auth_academy_id());

CREATE POLICY tenant_isolation ON chat_messages
  USING (academy_id = auth_academy_id());


-- =============================================================
-- AUTO-GENERATE HEALTH ALERT FLAGS (DB Trigger)
-- Fires after INSERT on health_logs
-- Flags fatigue ≥ 4, soreness ≥ 4, or sleep ≤ 2
-- =============================================================

CREATE OR REPLACE FUNCTION fn_auto_health_flag()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.fatigue_score >= 4 THEN
    INSERT INTO health_alert_flags (academy_id, player_id, health_log_id, flag_type, flag_value)
    VALUES (NEW.academy_id, NEW.player_id, NEW.id, 'high_fatigue', NEW.fatigue_score::TEXT);
  END IF;

  IF NEW.soreness_score >= 4 THEN
    INSERT INTO health_alert_flags (academy_id, player_id, health_log_id, flag_type, flag_value)
    VALUES (NEW.academy_id, NEW.player_id, NEW.id, 'high_soreness', NEW.soreness_score::TEXT);
  END IF;

  IF NEW.sleep_score <= 2 THEN
    INSERT INTO health_alert_flags (academy_id, player_id, health_log_id, flag_type, flag_value)
    VALUES (NEW.academy_id, NEW.player_id, NEW.id, 'poor_sleep', NEW.sleep_score::TEXT);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_health_flag
AFTER INSERT ON health_logs
FOR EACH ROW EXECUTE FUNCTION fn_auto_health_flag();

-- Also flag 'injured' attendance status
CREATE OR REPLACE FUNCTION fn_auto_injury_flag()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'injured' THEN
    INSERT INTO health_alert_flags (academy_id, player_id, attendance_id, flag_type, flag_value)
    VALUES (NEW.academy_id, NEW.player_id, NEW.id, 'injury_logged', 'attendance');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_injury_flag
AFTER INSERT OR UPDATE ON attendance
FOR EACH ROW EXECUTE FUNCTION fn_auto_injury_flag();


-- =============================================================
-- UPDATED_AT AUTO-STAMP TRIGGER
-- =============================================================

CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_updated_at BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_updated_at BEFORE UPDATE ON teams
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_updated_at BEFORE UPDATE ON sessions
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_updated_at BEFORE UPDATE ON session_blueprints
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_updated_at BEFORE UPDATE ON workout_assignments
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_updated_at BEFORE UPDATE ON player_details
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
