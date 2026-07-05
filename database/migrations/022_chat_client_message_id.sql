-- 022_chat_client_message_id.sql
-- Adds a client-generated idempotency key to `messages` so a chat send that
-- was queued offline and retried (e.g. after a flaky-connection reconnect)
-- cannot create a duplicate row. NULL for every message sent before this
-- migration and for any client that doesn't send one.

ALTER TABLE messages ADD COLUMN IF NOT EXISTS client_message_id UUID;

COMMENT ON COLUMN messages.client_message_id IS
  'Client-generated UUID used to de-duplicate retried/queued sends. NULL for older rows.';

-- Partial unique index: only enforced when a client actually sent a key, so
-- historical NULL rows and clients that don't send one are unaffected.
CREATE UNIQUE INDEX IF NOT EXISTS messages_channel_sender_client_id_uniq
  ON messages (channel_id, sender_id, client_message_id)
  WHERE client_message_id IS NOT NULL;
