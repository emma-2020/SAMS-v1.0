-- 024_lock_down_chat_attachments_bucket.sql
--
-- 'chat-attachments' was a fully public bucket (public = true): any object's
-- direct URL was fetchable by anyone, authenticated or not, with the only
-- protection being an unguessable random path segment. This migration makes
-- the bucket private and adds channel-membership-scoped RLS, matching
-- backend/src/services/chat.service.js's assertChannelMembership() exactly
-- (Admins get full academy access without an explicit membership row;
-- everyone else must have a chat_channel_members row for that channel).
--
-- Objects are stored as {academy_id}/{channel_id}/{timestamp}_{random}_{name}
-- (see chat.service.js's uploadAttachment), so storage.foldername(name)
-- yields academy_id and channel_id as the first two path segments.
--
-- The backend was updated in the same change to stop returning permanent
-- getPublicUrl() links and instead resolve a fresh createSignedUrl() on
-- every read (getMessages, sendMessage, uploadAttachment, and the admin
-- report-review view in chat_channels.service.js's getReports) — required
-- because this bucket no longer serves objects publicly.
--
-- The membership check is routed through a SECURITY DEFINER function
-- rather than a raw EXISTS subquery against chat_channel_members directly:
-- chat_channels' own SELECT policy queries chat_channel_members, and
-- chat_channel_members' SELECT policy queries chat_channels back — a
-- pre-existing mutual-recursion bug in this schema (invisible until now
-- because nothing previously exercised RLS on these tables; the backend
-- always reads them through the RLS-bypassing service-role client). A
-- SECURITY DEFINER function bypasses RLS on the subquery entirely,
-- avoiding that recursion — same pattern as the existing auth_academy_id()
-- and auth_user_role() helpers.

UPDATE storage.buckets SET public = false WHERE id = 'chat-attachments';

CREATE OR REPLACE FUNCTION public.is_chat_channel_member(p_channel_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_channel_members
    WHERE channel_id = p_channel_id AND user_id = auth.uid()
  );
$$;

DROP POLICY IF EXISTS "Authenticated users can upload chat attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete own chat attachments" ON storage.objects;

CREATE POLICY "Channel-scoped read chat attachments"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'chat-attachments'
    AND (
      public.is_chat_channel_member(((storage.foldername(name))[2])::uuid)
      OR (
        public.auth_user_role() = 'Admin'
        AND (storage.foldername(name))[1]::uuid = public.auth_academy_id()
      )
    )
  );

CREATE POLICY "Channel-scoped upload chat attachments"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'chat-attachments'
    AND (
      public.is_chat_channel_member(((storage.foldername(name))[2])::uuid)
      OR (
        public.auth_user_role() = 'Admin'
        AND (storage.foldername(name))[1]::uuid = public.auth_academy_id()
      )
    )
  );

CREATE POLICY "Channel-scoped delete chat attachments"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'chat-attachments'
    AND (
      public.is_chat_channel_member(((storage.foldername(name))[2])::uuid)
      OR (
        public.auth_user_role() = 'Admin'
        AND (storage.foldername(name))[1]::uuid = public.auth_academy_id()
      )
    )
  );
