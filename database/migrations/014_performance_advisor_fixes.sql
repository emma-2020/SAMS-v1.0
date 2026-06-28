-- ================================================================
-- Migration 014: Performance Advisor Fixes
-- Run AFTER 013 (which is merged into 012).
--
-- Fixes two categories of warnings from Supabase Performance Advisor:
--
-- A) Auth RLS Initialization Plan (lint 0003)
--    auth.uid() / auth_academy_id() / auth_user_role() / auth.jwt()
--    are re-evaluated once per row. Wrapping in (SELECT ...) makes
--    the planner evaluate them once per query instead.
--
-- B) Multiple Permissive Policies (lint 0006)
--    Every table has a tenant_isolation FOR ALL policy that overlaps
--    with specific INSERT/UPDATE policies, causing both to be executed
--    on every write. Fix: drop tenant_isolation, replace with a
--    SELECT-only read policy, rewrite specific policies with
--    (SELECT auth_...) syntax.
-- ================================================================


-- ================================================================
-- SECTION 1: Tables with ONLY tenant_isolation (no conflicting
-- specific policies). Drop and replace with a SELECT-only policy.
-- Fixes lint 0003 for the USING clause and removes the ALL policy
-- that could inadvertently allow client-side writes via anon.
-- Tables: rosters, teams, users, workout_exercises
-- ================================================================

DROP POLICY IF EXISTS "tenant_isolation" ON public.rosters;
CREATE POLICY "tenant_read"
  ON public.rosters FOR SELECT TO authenticated
  USING (academy_id = (SELECT public.auth_academy_id()));

DROP POLICY IF EXISTS "tenant_isolation" ON public.teams;
CREATE POLICY "tenant_read"
  ON public.teams FOR SELECT TO authenticated
  USING (academy_id = (SELECT public.auth_academy_id()));

DROP POLICY IF EXISTS "tenant_isolation" ON public.users;
CREATE POLICY "tenant_read"
  ON public.users FOR SELECT TO authenticated
  USING (academy_id = (SELECT public.auth_academy_id()));

DROP POLICY IF EXISTS "tenant_isolation" ON public.workout_exercises;
CREATE POLICY "tenant_read"
  ON public.workout_exercises FOR SELECT TO authenticated
  USING (academy_id = (SELECT public.auth_academy_id()));


-- ================================================================
-- SECTION 2: Tables with tenant_isolation AND specific write
-- policies (causing multiple permissive policy conflicts).
-- Fix: drop all, add SELECT + rewrite INSERT/UPDATE with (SELECT ...).
-- ================================================================

-- --- attendance ---
DROP POLICY IF EXISTS "tenant_isolation"  ON public.attendance;
DROP POLICY IF EXISTS "attendance_write"  ON public.attendance;
DROP POLICY IF EXISTS "attendance_update" ON public.attendance;

CREATE POLICY "attendance_read"
  ON public.attendance FOR SELECT TO authenticated
  USING (academy_id = (SELECT public.auth_academy_id()));

CREATE POLICY "attendance_write"
  ON public.attendance FOR INSERT TO authenticated
  WITH CHECK (
    academy_id = (SELECT public.auth_academy_id())
    AND (SELECT public.auth_user_role()) = ANY (ARRAY['Admin','Coach'])
  );

CREATE POLICY "attendance_update"
  ON public.attendance FOR UPDATE TO authenticated
  USING (
    academy_id = (SELECT public.auth_academy_id())
    AND (SELECT public.auth_user_role()) = ANY (ARRAY['Admin','Coach'])
  );


-- --- events ---
DROP POLICY IF EXISTS "tenant_isolation" ON public.events;
DROP POLICY IF EXISTS "events_write"     ON public.events;
DROP POLICY IF EXISTS "events_update"    ON public.events;

CREATE POLICY "events_read"
  ON public.events FOR SELECT TO authenticated
  USING (academy_id = (SELECT public.auth_academy_id()));

CREATE POLICY "events_write"
  ON public.events FOR INSERT TO authenticated
  WITH CHECK (
    academy_id = (SELECT public.auth_academy_id())
    AND (SELECT public.auth_user_role()) = ANY (ARRAY['Admin','Coach'])
  );

CREATE POLICY "events_update"
  ON public.events FOR UPDATE TO authenticated
  USING (
    academy_id = (SELECT public.auth_academy_id())
    AND (SELECT public.auth_user_role()) = ANY (ARRAY['Admin','Coach'])
  );


-- --- health_logs ---
DROP POLICY IF EXISTS "tenant_isolation" ON public.health_logs;
DROP POLICY IF EXISTS "health_log_write" ON public.health_logs;

CREATE POLICY "health_log_read"
  ON public.health_logs FOR SELECT TO authenticated
  USING (academy_id = (SELECT public.auth_academy_id()));

CREATE POLICY "health_log_write"
  ON public.health_logs FOR INSERT TO authenticated
  WITH CHECK (
    academy_id = (SELECT public.auth_academy_id())
    AND player_id = (SELECT auth.uid())
    AND (SELECT public.auth_user_role()) = 'Player'
  );


-- --- invitations ---
DROP POLICY IF EXISTS "tenant_isolation"  ON public.invitations;
DROP POLICY IF EXISTS "invitations_write" ON public.invitations;

CREATE POLICY "invitations_read"
  ON public.invitations FOR SELECT TO authenticated
  USING (academy_id = (SELECT public.auth_academy_id()));

CREATE POLICY "invitations_write"
  ON public.invitations FOR INSERT TO authenticated
  WITH CHECK (
    academy_id = (SELECT public.auth_academy_id())
    AND (SELECT public.auth_user_role()) = 'Admin'
  );


-- --- messages ---
DROP POLICY IF EXISTS "tenant_isolation" ON public.messages;
DROP POLICY IF EXISTS "messages_write"   ON public.messages;

CREATE POLICY "messages_read"
  ON public.messages FOR SELECT TO authenticated
  USING (academy_id = (SELECT public.auth_academy_id()));

CREATE POLICY "messages_write"
  ON public.messages FOR INSERT TO authenticated
  WITH CHECK (
    academy_id = (SELECT public.auth_academy_id())
    AND sender_id = (SELECT auth.uid())
  );


-- --- workout_assignments ---
DROP POLICY IF EXISTS "tenant_isolation"          ON public.workout_assignments;
DROP POLICY IF EXISTS "workout_assignment_write"  ON public.workout_assignments;
DROP POLICY IF EXISTS "workout_assignment_update" ON public.workout_assignments;

CREATE POLICY "workout_assignment_read"
  ON public.workout_assignments FOR SELECT TO authenticated
  USING (academy_id = (SELECT public.auth_academy_id()));

CREATE POLICY "workout_assignment_write"
  ON public.workout_assignments FOR INSERT TO authenticated
  WITH CHECK (
    academy_id = (SELECT public.auth_academy_id())
    AND (SELECT public.auth_user_role()) = ANY (ARRAY['Admin','Coach'])
  );

CREATE POLICY "workout_assignment_update"
  ON public.workout_assignments FOR UPDATE TO authenticated
  USING (
    academy_id = (SELECT public.auth_academy_id())
    AND (SELECT public.auth_user_role()) = ANY (ARRAY['Admin','Coach'])
  );


-- --- workout_completions ---
DROP POLICY IF EXISTS "tenant_isolation"         ON public.workout_completions;
DROP POLICY IF EXISTS "workout_completion_write"  ON public.workout_completions;
DROP POLICY IF EXISTS "workout_completion_update" ON public.workout_completions;

CREATE POLICY "workout_completion_read"
  ON public.workout_completions FOR SELECT TO authenticated
  USING (academy_id = (SELECT public.auth_academy_id()));

CREATE POLICY "workout_completion_write"
  ON public.workout_completions FOR INSERT TO authenticated
  WITH CHECK (
    academy_id = (SELECT public.auth_academy_id())
    AND player_id = (SELECT auth.uid())
    AND (SELECT public.auth_user_role()) = 'Player'
  );

CREATE POLICY "workout_completion_update"
  ON public.workout_completions FOR UPDATE TO authenticated
  USING (
    academy_id = (SELECT public.auth_academy_id())
    AND player_id = (SELECT auth.uid())
    AND (SELECT public.auth_user_role()) = 'Player'
  );


-- ================================================================
-- SECTION 3: Policies without tenant_isolation conflicts —
-- only need the (SELECT ...) wrapping fix (lint 0003).
-- ================================================================

-- --- notifications ---
DROP POLICY IF EXISTS "Users view own notifications"   ON public.notifications;
DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users delete own notifications" ON public.notifications;

CREATE POLICY "Users view own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (recipient_id = (SELECT auth.uid()));

CREATE POLICY "Users update own notifications"
  ON public.notifications FOR UPDATE TO authenticated
  USING (recipient_id = (SELECT auth.uid()));

CREATE POLICY "Users delete own notifications"
  ON public.notifications FOR DELETE TO authenticated
  USING (recipient_id = (SELECT auth.uid()));


-- --- audit_logs ---
DROP POLICY IF EXISTS "Admins read own academy audit logs" ON public.audit_logs;

CREATE POLICY "Admins read own academy audit logs"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (
    academy_id = ((SELECT auth.jwt()) ->> 'academy_id')::uuid
    AND ((SELECT auth.jwt()) ->> 'role') = 'Admin'
  );


-- --- chat_channels ---
DROP POLICY IF EXISTS "Members can view their channels"        ON public.chat_channels;
DROP POLICY IF EXISTS "Admins and coaches can create channels" ON public.chat_channels;
DROP POLICY IF EXISTS "Admins and coaches can update channels" ON public.chat_channels;
DROP POLICY IF EXISTS "Admins can delete channels"             ON public.chat_channels;

CREATE POLICY "Members can view their channels"
  ON public.chat_channels FOR SELECT TO authenticated
  USING (
    academy_id = (SELECT public.auth_academy_id())
    AND EXISTS (
      SELECT 1 FROM public.chat_channel_members ccm
      WHERE ccm.channel_id = id AND ccm.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Admins and coaches can create channels"
  ON public.chat_channels FOR INSERT TO authenticated
  WITH CHECK (
    academy_id = (SELECT public.auth_academy_id())
    AND (SELECT public.auth_user_role()) = ANY (ARRAY['Admin','Coach'])
  );

CREATE POLICY "Admins and coaches can update channels"
  ON public.chat_channels FOR UPDATE TO authenticated
  USING (
    academy_id = (SELECT public.auth_academy_id())
    AND (SELECT public.auth_user_role()) = ANY (ARRAY['Admin','Coach'])
  );

CREATE POLICY "Admins can delete channels"
  ON public.chat_channels FOR DELETE TO authenticated
  USING (
    academy_id = (SELECT public.auth_academy_id())
    AND (SELECT public.auth_user_role()) = 'Admin'
  );


-- --- chat_channel_members ---
DROP POLICY IF EXISTS "Academy members can view channel membership"         ON public.chat_channel_members;
DROP POLICY IF EXISTS "Admins and coaches can add channel members"          ON public.chat_channel_members;
DROP POLICY IF EXISTS "Admins and coaches can update member settings"       ON public.chat_channel_members;
DROP POLICY IF EXISTS "Users can leave channels; admins can remove members" ON public.chat_channel_members;

CREATE POLICY "Academy members can view channel membership"
  ON public.chat_channel_members FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_channels cc
      WHERE cc.id = channel_id
        AND cc.academy_id = (SELECT public.auth_academy_id())
    )
  );

CREATE POLICY "Admins and coaches can add channel members"
  ON public.chat_channel_members FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT public.auth_user_role()) = ANY (ARRAY['Admin','Coach'])
    AND EXISTS (
      SELECT 1 FROM public.chat_channels cc
      WHERE cc.id = channel_id AND cc.academy_id = (SELECT public.auth_academy_id())
    )
  );

CREATE POLICY "Admins and coaches can update member settings"
  ON public.chat_channel_members FOR UPDATE TO authenticated
  USING (
    (SELECT public.auth_user_role()) = ANY (ARRAY['Admin','Coach'])
    AND EXISTS (
      SELECT 1 FROM public.chat_channels cc
      WHERE cc.id = channel_id AND cc.academy_id = (SELECT public.auth_academy_id())
    )
  );

CREATE POLICY "Users can leave channels; admins can remove members"
  ON public.chat_channel_members FOR DELETE TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR (
      (SELECT public.auth_user_role()) = ANY (ARRAY['Admin','Coach'])
      AND EXISTS (
        SELECT 1 FROM public.chat_channels cc
        WHERE cc.id = channel_id AND cc.academy_id = (SELECT public.auth_academy_id())
      )
    )
  );


-- --- blocked_users ---
DROP POLICY IF EXISTS "Users can view their own block list"     ON public.blocked_users;
DROP POLICY IF EXISTS "Users can block others in their academy" ON public.blocked_users;
DROP POLICY IF EXISTS "Users can unblock"                       ON public.blocked_users;

CREATE POLICY "Users can view their own block list"
  ON public.blocked_users FOR SELECT TO authenticated
  USING (
    blocker_id = (SELECT auth.uid())
    AND academy_id = (SELECT public.auth_academy_id())
  );

CREATE POLICY "Users can block others in their academy"
  ON public.blocked_users FOR INSERT TO authenticated
  WITH CHECK (
    blocker_id = (SELECT auth.uid())
    AND academy_id = (SELECT public.auth_academy_id())
    AND blocker_id <> blocked_id
  );

CREATE POLICY "Users can unblock"
  ON public.blocked_users FOR DELETE TO authenticated
  USING (
    blocker_id = (SELECT auth.uid())
    AND academy_id = (SELECT public.auth_academy_id())
  );


-- --- reported_messages ---
DROP POLICY IF EXISTS "Users can submit reports"               ON public.reported_messages;
DROP POLICY IF EXISTS "Admins and coaches can view reports"    ON public.reported_messages;
DROP POLICY IF EXISTS "Admins and coaches can action reports"  ON public.reported_messages;

CREATE POLICY "Users can submit reports"
  ON public.reported_messages FOR INSERT TO authenticated
  WITH CHECK (
    reported_by = (SELECT auth.uid())
    AND academy_id = (SELECT public.auth_academy_id())
    AND status = 'pending'
  );

CREATE POLICY "Admins and coaches can view reports"
  ON public.reported_messages FOR SELECT TO authenticated
  USING (
    academy_id = (SELECT public.auth_academy_id())
    AND (SELECT public.auth_user_role()) = ANY (ARRAY['Admin','Coach'])
  );

CREATE POLICY "Admins and coaches can action reports"
  ON public.reported_messages FOR UPDATE TO authenticated
  USING (
    academy_id = (SELECT public.auth_academy_id())
    AND (SELECT public.auth_user_role()) = ANY (ARRAY['Admin','Coach'])
  );
