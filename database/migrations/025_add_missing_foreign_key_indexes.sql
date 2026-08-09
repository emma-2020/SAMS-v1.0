-- 025_add_missing_foreign_key_indexes.sql
--
-- Supabase performance advisor flagged 9 foreign key columns with no
-- covering index — real query cost (slower joins/lookups, slower cascade
-- deletes) independent of whether RLS is ever evaluated on these tables.
-- Deliberately NOT addressing the advisor's other two categories in this
-- migration: 50 "multiple permissive policies" findings (low value — the
-- app almost never actually reaches RLS, since backend queries go through
-- the service-role client) and 28 "unused index" suggestions (dropping an
-- index flagged unused in a thin, low-traffic pilot window risks a real
-- regression later for no concrete gain today).

CREATE INDEX IF NOT EXISTS idx_announcements_created_by        ON public.announcements(created_by);
CREATE INDEX IF NOT EXISTS idx_call_sessions_academy_id         ON public.call_sessions(academy_id);
CREATE INDEX IF NOT EXISTS idx_call_sessions_caller_id          ON public.call_sessions(caller_id);
CREATE INDEX IF NOT EXISTS idx_fee_ledger_created_by            ON public.fee_ledger(created_by);
CREATE INDEX IF NOT EXISTS idx_fee_ledger_player_id             ON public.fee_ledger(player_id);
CREATE INDEX IF NOT EXISTS idx_meetings_created_by              ON public.meetings(created_by);
CREATE INDEX IF NOT EXISTS idx_player_documents_player_id       ON public.player_documents(player_id);
CREATE INDEX IF NOT EXISTS idx_player_documents_uploaded_by     ON public.player_documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_player_registrations_reviewed_by ON public.player_registrations(reviewed_by);
