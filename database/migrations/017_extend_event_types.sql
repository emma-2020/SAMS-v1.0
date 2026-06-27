-- Extend the events.type CHECK constraint to include all session types
-- used by the Coach schedule UI (Training, Match, Friendly, Recovery, Meeting)
-- while preserving the existing Practice and Game values.
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_type_check;
ALTER TABLE events ADD CONSTRAINT events_type_check
  CHECK (type IN ('Practice', 'Game', 'Training', 'Match', 'Friendly', 'Recovery', 'Meeting'));
