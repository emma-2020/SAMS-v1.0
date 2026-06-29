-- ─────────────────────────────────────────────────────────────────────────────
-- 005_meetings_and_calls.sql
-- Scheduled meetings (Teams/Meet-style) + instant call sessions (WhatsApp-style)
-- Run in Supabase SQL Editor after 003_security_fixes_and_workouts.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Scheduled meetings ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS meetings (
  id                UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  academy_id        UUID         NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
  title             TEXT         NOT NULL,
  agenda            TEXT,
  scheduled_at      TIMESTAMPTZ  NOT NULL,
  duration_minutes  INT          NOT NULL DEFAULT 60,
  daily_room_name   TEXT,
  daily_room_url    TEXT,
  created_by        UUID         REFERENCES profiles(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS meeting_attendees (
  id          UUID  DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id  UUID  NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  user_id     UUID  NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status      TEXT  NOT NULL DEFAULT 'invited',
  UNIQUE(meeting_id, user_id)
);

-- ── Instant call sessions (direct / group calls) ──────────────────────────────

CREATE TABLE IF NOT EXISTS call_sessions (
  id               UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  academy_id       UUID         NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
  caller_id        UUID         REFERENCES profiles(id) ON DELETE SET NULL,
  team_id          UUID         REFERENCES teams(id)   ON DELETE CASCADE,
  recipient_id     UUID         REFERENCES profiles(id) ON DELETE SET NULL,
  daily_room_name  TEXT         NOT NULL,
  daily_room_url   TEXT         NOT NULL,
  status           TEXT         NOT NULL DEFAULT 'ringing',
  created_at       TIMESTAMPTZ  DEFAULT NOW(),
  ended_at         TIMESTAMPTZ
);

-- ── RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE meetings          ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_sessions     ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_meetings"
  ON meetings FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "service_role_all_attendees"
  ON meeting_attendees FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "service_role_all_calls"
  ON call_sessions FOR ALL USING (auth.role() = 'service_role');

-- ── Indexes ───────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_meetings_academy        ON meetings(academy_id);
CREATE INDEX IF NOT EXISTS idx_meetings_scheduled_at   ON meetings(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_attendees_meeting        ON meeting_attendees(meeting_id);
CREATE INDEX IF NOT EXISTS idx_attendees_user           ON meeting_attendees(user_id);
CREATE INDEX IF NOT EXISTS idx_calls_recipient          ON call_sessions(recipient_id);
CREATE INDEX IF NOT EXISTS idx_calls_team               ON call_sessions(team_id);
CREATE INDEX IF NOT EXISTS idx_calls_status             ON call_sessions(status);
