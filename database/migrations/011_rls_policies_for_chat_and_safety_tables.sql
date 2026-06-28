-- ================================================================
-- Migration 011: RLS policies for tables with RLS enabled but no policies
-- Run AFTER 010_security_advisor_fixes.sql
--
-- Tables:
--   chat_channels          — users see only channels they belong to
--   chat_channel_members   — academy-scoped membership visibility
--   blocked_users          — users manage their own block list
--   reported_messages      — admins/coaches review; users submit
--   platform_admins        — explicit deny-all (service role only)
--
-- NOTE: RLS is already enabled on all five tables (by the
-- rls_auto_enable event trigger). These statements add policies only.
-- ================================================================


-- ================================================================
-- 1. chat_channels
--    SELECT: only channels the user is a member of, within their academy.
--    INSERT: Admin and Coach can create channels.
--    UPDATE: Admin and Coach can edit channels.
--    DELETE: Admin only.
-- ================================================================

CREATE POLICY "Members can view their channels"
  ON public.chat_channels FOR SELECT TO authenticated
  USING (
    academy_id = public.auth_academy_id()
    AND EXISTS (
      SELECT 1 FROM public.chat_channel_members ccm
      WHERE ccm.channel_id = id AND ccm.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins and coaches can create channels"
  ON public.chat_channels FOR INSERT TO authenticated
  WITH CHECK (
    academy_id = public.auth_academy_id()
    AND public.auth_user_role() IN ('Admin', 'Coach')
  );

CREATE POLICY "Admins and coaches can update channels"
  ON public.chat_channels FOR UPDATE TO authenticated
  USING (
    academy_id = public.auth_academy_id()
    AND public.auth_user_role() IN ('Admin', 'Coach')
  );

CREATE POLICY "Admins can delete channels"
  ON public.chat_channels FOR DELETE TO authenticated
  USING (
    academy_id = public.auth_academy_id()
    AND public.auth_user_role() = 'Admin'
  );


-- ================================================================
-- 2. chat_channel_members
--    SELECT: all members in the user's academy (avoids self-referential
--            recursion; academy isolation is enforced via chat_channels).
--    INSERT: Admin and Coach can add members.
--    UPDATE: Admin and Coach can mute/unmute members.
--    DELETE: users can leave; admins/coaches can remove members.
-- ================================================================

CREATE POLICY "Academy members can view channel membership"
  ON public.chat_channel_members FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_channels cc
      WHERE cc.id = channel_id
        AND cc.academy_id = public.auth_academy_id()
    )
  );

CREATE POLICY "Admins and coaches can add channel members"
  ON public.chat_channel_members FOR INSERT TO authenticated
  WITH CHECK (
    public.auth_user_role() IN ('Admin', 'Coach')
    AND EXISTS (
      SELECT 1 FROM public.chat_channels cc
      WHERE cc.id = channel_id AND cc.academy_id = public.auth_academy_id()
    )
  );

CREATE POLICY "Admins and coaches can update member settings"
  ON public.chat_channel_members FOR UPDATE TO authenticated
  USING (
    public.auth_user_role() IN ('Admin', 'Coach')
    AND EXISTS (
      SELECT 1 FROM public.chat_channels cc
      WHERE cc.id = channel_id AND cc.academy_id = public.auth_academy_id()
    )
  );

CREATE POLICY "Users can leave channels; admins can remove members"
  ON public.chat_channel_members FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR (
      public.auth_user_role() IN ('Admin', 'Coach')
      AND EXISTS (
        SELECT 1 FROM public.chat_channels cc
        WHERE cc.id = channel_id AND cc.academy_id = public.auth_academy_id()
      )
    )
  );


-- ================================================================
-- 3. blocked_users
--    Users manage only their own block list, within their academy.
-- ================================================================

CREATE POLICY "Users can view their own block list"
  ON public.blocked_users FOR SELECT TO authenticated
  USING (blocker_id = auth.uid() AND academy_id = public.auth_academy_id());

CREATE POLICY "Users can block others in their academy"
  ON public.blocked_users FOR INSERT TO authenticated
  WITH CHECK (
    blocker_id = auth.uid()
    AND academy_id = public.auth_academy_id()
    AND blocker_id <> blocked_id
  );

CREATE POLICY "Users can unblock"
  ON public.blocked_users FOR DELETE TO authenticated
  USING (blocker_id = auth.uid() AND academy_id = public.auth_academy_id());


-- ================================================================
-- 4. reported_messages
--    Any authenticated user can report a message in their academy.
--    Only Admins and Coaches can view and action reports.
-- ================================================================

CREATE POLICY "Users can submit reports"
  ON public.reported_messages FOR INSERT TO authenticated
  WITH CHECK (
    reported_by = auth.uid()
    AND academy_id = public.auth_academy_id()
    AND status = 'pending'
  );

CREATE POLICY "Admins and coaches can view reports"
  ON public.reported_messages FOR SELECT TO authenticated
  USING (
    academy_id = public.auth_academy_id()
    AND public.auth_user_role() IN ('Admin', 'Coach')
  );

CREATE POLICY "Admins and coaches can action reports"
  ON public.reported_messages FOR UPDATE TO authenticated
  USING (
    academy_id = public.auth_academy_id()
    AND public.auth_user_role() IN ('Admin', 'Coach')
  );


-- ================================================================
-- 5. platform_admins
--    Accessed exclusively via supabaseAdmin (service-role key) which
--    bypasses RLS. An explicit USING (false) policy makes the intent
--    clear and silences the "RLS enabled but no policy" linter warning.
-- ================================================================

CREATE POLICY "No direct user access to platform admins"
  ON public.platform_admins AS RESTRICTIVE
  FOR ALL TO authenticated, anon
  USING (false)
  WITH CHECK (false);
