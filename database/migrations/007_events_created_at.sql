-- ================================================================
-- 007: Add created_at to events table
--
-- The events table was missing a created_at timestamp column.
-- The schedule service (createEvent) selected this column after
-- INSERT, causing "column events.created_at does not exist" errors
-- and a 500 on every attempt to block a venue / save a session.
-- ================================================================

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
