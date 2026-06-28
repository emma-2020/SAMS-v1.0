-- ================================================================
-- Migration 016: User preferences, academy profile, role permissions
-- ================================================================
-- Adds:
--   users.preferences         JSONB  — per-user notification + role-specific settings
--   academies.logo_url        TEXT   — academy logo (Supabase Storage public URL)
--   academies.role_permissions JSONB — admin-controlled academy-wide permission flags
-- ================================================================

-- User preferences column (stores notifications + role-specific settings as JSONB)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS preferences JSONB NOT NULL DEFAULT '{}';

COMMENT ON COLUMN users.preferences IS
  'Per-user settings: notification toggles, role-specific preferences (health sharing, emergency contact, etc.)';

-- Academy logo
ALTER TABLE academies
  ADD COLUMN IF NOT EXISTS logo_url TEXT;

COMMENT ON COLUMN academies.logo_url IS
  'Public URL of the academy logo stored in Supabase Storage bucket "academy-logos".';

-- Academy-wide role permissions controlled by the Admin
ALTER TABLE academies
  ADD COLUMN IF NOT EXISTS role_permissions JSONB NOT NULL DEFAULT '{}';

COMMENT ON COLUMN academies.role_permissions IS
  'Admin-controlled permission flags. Keys: parents_can_view_attendance, players_can_see_teammate_contacts, coaches_can_post_announcements.';
