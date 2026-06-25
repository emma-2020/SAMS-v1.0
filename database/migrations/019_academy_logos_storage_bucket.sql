-- Migration 019: Create academy-logos storage bucket
-- Required for Settings > Academy > Logo upload feature.
-- This bucket stores one logo per academy, keyed as {academy_id}.{ext}.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'academy-logos',
  'academy-logos',
  true,
  2097152,  -- 2 MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to read public logos
CREATE POLICY "Academy logos are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'academy-logos');

-- Only service role (backend) can upload/update logos (enforced via supabaseAdmin)
