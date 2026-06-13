-- 004_chat_attachments.sql
-- Adds file attachment support to the messages table.
-- Run after 003_security_fixes_and_workouts.sql.

-- 1. Make message_text nullable — a message may consist of an attachment alone
ALTER TABLE messages ALTER COLUMN message_text DROP NOT NULL;

-- 2. Add attachment metadata columns
ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_url  TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS file_name       TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS mime_type       TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS file_size       INTEGER;

-- 3. Every message must carry text, an attachment, or both
ALTER TABLE messages ADD CONSTRAINT messages_has_content
  CHECK (
    (message_text IS NOT NULL AND trim(message_text) <> '')
    OR attachment_url IS NOT NULL
  );

-- 4. Create the chat-attachments Storage bucket (public read)
--    Files are scoped to academy_id/team_id/ paths so RLS policies
--    can be applied at the prefix level if needed in a future release.
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-attachments', 'chat-attachments', true)
ON CONFLICT (id) DO NOTHING;
