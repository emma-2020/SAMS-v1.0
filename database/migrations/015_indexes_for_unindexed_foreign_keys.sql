-- ================================================================
-- Migration 015: Add missing indexes for unindexed FK columns
-- Run AFTER 014_performance_advisor_fixes.sql
--
-- Foreign key columns without indexes can cause full sequential
-- scans when Postgres checks referential integrity on parent-table
-- deletes and when JOINs use these columns.
-- ================================================================

CREATE INDEX IF NOT EXISTS idx_attendance_logged_by              ON public.attendance(logged_by);
CREATE INDEX IF NOT EXISTS idx_blocked_users_academy_id          ON public.blocked_users(academy_id);
CREATE INDEX IF NOT EXISTS idx_chat_channels_created_by          ON public.chat_channels(created_by);
CREATE INDEX IF NOT EXISTS idx_events_created_by                 ON public.events(created_by);
CREATE INDEX IF NOT EXISTS idx_invitations_invited_by            ON public.invitations(invited_by);
CREATE INDEX IF NOT EXISTS idx_notifications_academy_id          ON public.notifications(academy_id);
CREATE INDEX IF NOT EXISTS idx_enrollment_requests_reviewed_by   ON public.platform_enrollment_requests(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_reported_messages_message_id      ON public.reported_messages(message_id);
CREATE INDEX IF NOT EXISTS idx_reported_messages_reported_by     ON public.reported_messages(reported_by);
CREATE INDEX IF NOT EXISTS idx_reported_messages_reviewed_by     ON public.reported_messages(reviewed_by);
