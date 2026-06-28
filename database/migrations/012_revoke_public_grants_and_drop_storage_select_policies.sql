-- ================================================================
-- Migration 012: Remove PUBLIC grants + drop storage SELECT policies
-- Run AFTER 011_rls_policies_for_chat_and_safety_tables.sql
--
-- Changes:
--   1. rls_auto_enable: revoke EXECUTE from PUBLIC (event trigger,
--      not a REST endpoint)
--   2. auth_academy_id / auth_user_role: revoke PUBLIC grant, re-grant
--      to authenticated only (anon access removed; RLS still works)
--   3. Storage SELECT policies dropped — public buckets serve direct
--      URLs via bucket public=true flag without needing storage RLS
-- ================================================================

-- 1. rls_auto_enable: should never be callable via /rest/v1/rpc/
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC;

-- 2. RLS helper functions: remove PUBLIC grant, keep authenticated
REVOKE EXECUTE ON FUNCTION public.auth_academy_id() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.auth_academy_id() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.auth_user_role() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.auth_user_role() TO authenticated;

-- Individual anon grants survived the PUBLIC revoke — remove explicitly
REVOKE EXECUTE ON FUNCTION public.auth_academy_id() FROM anon;
REVOKE EXECUTE ON FUNCTION public.auth_user_role()  FROM anon;

-- 3. Drop storage SELECT policies entirely (public URL access unaffected)
DROP POLICY IF EXISTS "Authenticated users can view avatars"          ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read chat attachments" ON storage.objects;
