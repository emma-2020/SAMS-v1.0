-- 023_academy_scope_document_storage_policies.sql
--
-- Fixes a cross-tenant data exposure: storage.objects policies for the
-- 'player-documents' and 'registration-documents' buckets only checked
-- bucket_id, with no academy scoping. Since users hold a real Supabase
-- session JWT (persisted client-side for the app's own auth flow), any
-- authenticated user on the platform — not just members of the owning
-- academy — could read/upload/delete another academy's uploaded medical
-- clearance forms, birth certificates, national ID scans, and parental
-- consent documents by calling the Supabase Storage API directly with
-- their own token, bypassing the Express backend's academy-scoping.
--
-- Both buckets store objects under a `{academy_id}/{player_id}/...` path
-- (see backend/src/services/registration.service.js's uploadDocument),
-- so storage.foldername(name) reliably yields the owning academy_id as
-- the first path segment. Legitimate reads already go through
-- server-generated short-lived signed URLs (registration.service.js's
-- getSignedUrl), which are authorized independently of these policies —
-- this migration only closes the gap for direct, policy-gated access.

-- ── player-documents ────────────────────────────────────────────────
DROP POLICY IF EXISTS "Authenticated users can read player documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload player documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete player documents" ON storage.objects;

CREATE POLICY "Academy-scoped read player documents"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'player-documents'
    AND (storage.foldername(name))[1]::uuid = public.auth_academy_id()
  );

CREATE POLICY "Academy-scoped upload player documents"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'player-documents'
    AND (storage.foldername(name))[1]::uuid = public.auth_academy_id()
  );

CREATE POLICY "Academy-scoped delete player documents"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'player-documents'
    AND (storage.foldername(name))[1]::uuid = public.auth_academy_id()
  );

-- ── registration-documents ──────────────────────────────────────────
DROP POLICY IF EXISTS "Authenticated users can read registration documents" ON storage.objects;
DROP POLICY IF EXISTS "Players can upload registration documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete registration documents" ON storage.objects;

CREATE POLICY "Academy-scoped read registration documents"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'registration-documents'
    AND (storage.foldername(name))[1]::uuid = public.auth_academy_id()
  );

CREATE POLICY "Academy-scoped upload registration documents"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'registration-documents'
    AND (storage.foldername(name))[1]::uuid = public.auth_academy_id()
  );

CREATE POLICY "Academy-scoped delete registration documents"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'registration-documents'
    AND (storage.foldername(name))[1]::uuid = public.auth_academy_id()
  );
