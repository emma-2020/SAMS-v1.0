-- Migration 005: Storage RLS policies for chat-attachments bucket
--
-- The chat-attachments bucket row was created by migration 004.
-- Without these policies, storage.objects INSERT is blocked for all roles
-- (including service_role through the Storage API layer) because Supabase
-- Storage enforces storage.objects RLS independently of the JWT role.
--
-- Applied: 2026-06-13 via Supabase MCP (already live on the remote project).
-- Run this in the Supabase SQL Editor if setting up a fresh project.

-- Authenticated users may upload files to chat-attachments
CREATE POLICY "Authenticated users can upload chat attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'chat-attachments');

-- Anyone may read chat attachments (bucket is public = true)
CREATE POLICY "Public can read chat attachments"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'chat-attachments');

-- Authenticated users may delete their own uploads
CREATE POLICY "Authenticated users can delete own chat attachments"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'chat-attachments');
