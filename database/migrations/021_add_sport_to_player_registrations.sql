-- Add sport column to player_registrations
-- Allows multi-sport academies to track which sport a player registered for
ALTER TABLE player_registrations
  ADD COLUMN IF NOT EXISTS sport TEXT;
