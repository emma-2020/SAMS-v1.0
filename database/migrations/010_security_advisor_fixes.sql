-- ================================================================
-- Migration 010: Security Advisor Fixes
-- Resolves all 17 WARN items from Supabase Security Advisor
-- Run AFTER 009_platform_mfa.sql
--
-- Changes:
--   1. Add SET search_path = '' to all 6 mutable-search-path functions
--   2. Revoke public EXECUTE on rls_auto_enable (event trigger, not an RPC)
--   3. Drop overly-permissive notifications INSERT policy (dead code)
--   4. Replace WITH CHECK (true) on platform_enrollment_requests INSERT
--   5. Replace broad storage SELECT policies with authenticated-only
-- ================================================================


-- ================================================================
-- 1. Fix mutable search_path on public functions (lint 0011)
--    Empty search_path prevents search_path injection attacks.
--    Table references must be fully schema-qualified.
-- ================================================================

CREATE OR REPLACE FUNCTION public.auth_academy_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT academy_id FROM public.users WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.auth_user_role()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT role FROM public.users WHERE id = auth.uid() LIMIT 1;
$$;

-- Trigger functions: no table references in body, search_path = '' is safe
CREATE OR REPLACE FUNCTION public.fn_set_updated_at()
RETURNS trigger LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_attendance_updated_at()
RETURNS trigger LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_health_flag_check()
RETURNS trigger LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.fatigue >= 4 OR NEW.soreness >= 4 OR NEW.sleep_quality <= 2 THEN
    NEW.is_flagged := TRUE;
  ELSE
    NEW.is_flagged := FALSE;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_chat_channel_timestamp()
RETURNS trigger LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


-- ================================================================
-- 2. Revoke public EXECUTE on rls_auto_enable (lint 0028/0029)
--    rls_auto_enable() returns event_trigger — PostgREST cannot expose
--    it via /rpc/, so these warnings are linter false positives.
--    Revoke anyway for defense in depth.
-- ================================================================

REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon, authenticated;


-- ================================================================
-- 3. Fix notifications INSERT policy (lint 0024)
--    "Service role insert notifications" has WITH CHECK (true) and
--    applies to all roles. The backend inserts via supabaseAdmin
--    (service-role key) which bypasses RLS entirely — this policy
--    is dead code that also grants any role unrestricted INSERT.
--    Drop it; no replacement needed.
-- ================================================================

DROP POLICY IF EXISTS "Service role insert notifications" ON public.notifications;


-- ================================================================
-- 4. Fix platform_enrollment_requests INSERT policy (lint 0024)
--    Replace WITH CHECK (true) with a real data-validity check.
--    Intent preserved: public (anon) enrollment form submissions.
-- ================================================================

DROP POLICY IF EXISTS "Public can submit enrollment requests"
  ON public.platform_enrollment_requests;

CREATE POLICY "Public can submit enrollment requests"
  ON public.platform_enrollment_requests
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    length(trim(academy_name))   > 0
    AND length(trim(contact_name)) > 0
    AND contact_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    AND status = 'pending'
  );


-- ================================================================
-- 5. Fix public storage SELECT policies (lint 0025)
--    The broad "SELECT WHERE bucket_id = '...'" policies allow any
--    client to LIST all files in the bucket via the storage API.
--    Direct URL access to individual files continues to work because
--    both buckets are marked public = true at the bucket level.
--    Replace with authenticated-only SELECT (no listing by anon).
-- ================================================================

-- avatars
DROP POLICY IF EXISTS "Public avatars are viewable by everyone" ON storage.objects;
CREATE POLICY "Authenticated users can view avatars"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'avatars');

-- chat-attachments
DROP POLICY IF EXISTS "Public can read chat attachments" ON storage.objects;
CREATE POLICY "Authenticated users can read chat attachments"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'chat-attachments');


-- ================================================================
-- NOTE: "Leaked Password Protection Disabled" (lint auth_leaked_password_protection)
-- Cannot be fixed via SQL. Enable it in:
--   Supabase Dashboard → Authentication → Settings → Password Security
--   → Enable "Check passwords against known leaked password list (HaveIBeenPwned.org)"
-- ================================================================
