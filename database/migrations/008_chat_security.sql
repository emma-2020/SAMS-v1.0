-- Migration 008: Chat security & safeguarding features
-- Adds: per-academy chat policy settings, per-member mute, blocked_users, reported_messages

-- 1. Per-academy chat policy settings (JSONB on academies)
--    Shape: { "chat_coach_player_dm": false }
--    Default false = Coach <-> Player DMs blocked (safest default)
ALTER TABLE academies
  ADD COLUMN IF NOT EXISTS settings JSONB NOT NULL DEFAULT '{}';

-- 2. Mute support on existing chat_channel_members
ALTER TABLE chat_channel_members
  ADD COLUMN IF NOT EXISTS is_muted   BOOLEAN     NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS muted_until TIMESTAMPTZ;

-- 3. Block list (per-academy so cross-tenant isolation is maintained)
CREATE TABLE IF NOT EXISTS blocked_users (
  blocker_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  academy_id  UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_blocked_users_blocker ON blocked_users(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocked  ON blocked_users(blocked_id);

-- 4. Reported messages queue
CREATE TABLE IF NOT EXISTS reported_messages (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id   UUID        NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
  message_id   UUID        NOT NULL REFERENCES messages(id)  ON DELETE CASCADE,
  reported_by  UUID        NOT NULL REFERENCES users(id)     ON DELETE CASCADE,
  reason       TEXT        NOT NULL,
  notes        TEXT,
  status       TEXT        NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending', 'reviewed', 'dismissed')),
  reviewed_by  UUID        REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reported_messages_academy ON reported_messages(academy_id);
CREATE INDEX IF NOT EXISTS idx_reported_messages_status  ON reported_messages(status);
