-- Migration 006: WhatsApp-style group channels
-- Run in Supabase SQL Editor AFTER 005_chat_attachments_storage_policies.sql
-- Adds chat_channels + chat_channel_members tables
-- Migrates existing team-based messages to channel_id

-- 1. Create chat_channels table
CREATE TABLE IF NOT EXISTS chat_channels (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id   UUID        NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
  name         TEXT        NOT NULL,
  description  TEXT,
  type         TEXT        NOT NULL DEFAULT 'custom_group'
               CHECK (type IN ('team', 'role_group', 'custom_group', 'direct')),
  team_id      UUID        REFERENCES teams(id) ON DELETE CASCADE,
  icon_color   TEXT,
  created_by   UUID        REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create chat_channel_members table
CREATE TABLE IF NOT EXISTS chat_channel_members (
  channel_id   UUID        NOT NULL REFERENCES chat_channels(id) ON DELETE CASCADE,
  user_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_admin     BOOLEAN     NOT NULL DEFAULT FALSE,
  joined_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (channel_id, user_id)
);

-- 3. Add channel_id to messages (nullable — team channels keep team_id, DMs/groups use only channel_id)
ALTER TABLE messages ADD COLUMN IF NOT EXISTS channel_id UUID REFERENCES chat_channels(id) ON DELETE CASCADE;

-- 4. Make team_id nullable on messages so DMs and custom groups don't need a team
ALTER TABLE messages ALTER COLUMN team_id DROP NOT NULL;

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_chat_channels_academy_id  ON chat_channels(academy_id);
CREATE INDEX IF NOT EXISTS idx_chat_channels_team_id     ON chat_channels(team_id);
CREATE INDEX IF NOT EXISTS idx_ccm_channel_id            ON chat_channel_members(channel_id);
CREATE INDEX IF NOT EXISTS idx_ccm_user_id               ON chat_channel_members(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_channel_id       ON messages(channel_id, created_at DESC);

-- 6. Migrate existing teams → channel records (teams table has no created_at so use NOW())
INSERT INTO chat_channels (id, academy_id, name, type, team_id, created_at, updated_at)
SELECT
  gen_random_uuid(),
  t.academy_id,
  t.name,
  'team',
  t.id,
  NOW(),
  NOW()
FROM teams t;

-- 7. Back-fill channel_id on existing messages
UPDATE messages m
SET    channel_id = c.id
FROM   chat_channels c
WHERE  c.team_id   = m.team_id
  AND  c.type      = 'team'
  AND  m.channel_id IS NULL
  AND  m.team_id   IS NOT NULL;

-- 8. Populate members from existing rosters
-- Coaches (teams.coach_id)
INSERT INTO chat_channel_members (channel_id, user_id, is_admin)
SELECT DISTINCT c.id, t.coach_id, true
FROM   chat_channels c
JOIN   teams t ON t.id = c.team_id
WHERE  c.type = 'team'
  AND  t.coach_id IS NOT NULL
ON CONFLICT (channel_id, user_id) DO NOTHING;

-- Players
INSERT INTO chat_channel_members (channel_id, user_id, is_admin)
SELECT DISTINCT c.id, r.player_id, false
FROM   chat_channels c
JOIN   rosters r ON r.team_id = c.team_id AND r.academy_id = c.academy_id
WHERE  c.type = 'team'
  AND  r.player_id IS NOT NULL
ON CONFLICT (channel_id, user_id) DO NOTHING;

-- Parents
INSERT INTO chat_channel_members (channel_id, user_id, is_admin)
SELECT DISTINCT c.id, r.parent_id, false
FROM   chat_channels c
JOIN   rosters r ON r.team_id = c.team_id AND r.academy_id = c.academy_id
WHERE  c.type = 'team'
  AND  r.parent_id IS NOT NULL
ON CONFLICT (channel_id, user_id) DO NOTHING;

-- 9. Auto-updated_at trigger
CREATE OR REPLACE FUNCTION update_chat_channel_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS chat_channels_updated_at ON chat_channels;
CREATE TRIGGER chat_channels_updated_at
  BEFORE UPDATE ON chat_channels
  FOR EACH ROW EXECUTE FUNCTION update_chat_channel_timestamp();
