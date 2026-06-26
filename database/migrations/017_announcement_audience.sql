-- ================================================================
-- Migration 017: Announcement audience targeting
-- ================================================================
-- Adds:
--   announcements.audience  TEXT  — who receives the announcement
--     Values: 'everyone' | 'players' | 'coaches' | 'parents'
-- ================================================================

ALTER TABLE announcements
  ADD COLUMN IF NOT EXISTS audience TEXT NOT NULL DEFAULT 'everyone'
  CHECK (audience IN ('everyone', 'players', 'coaches', 'parents'));

COMMENT ON COLUMN announcements.audience IS
  'Audience filter: everyone = all members, or a specific role group.';

-- Index for efficient role-filtered queries
CREATE INDEX IF NOT EXISTS idx_announcements_audience
  ON announcements (academy_id, audience, created_at DESC);
