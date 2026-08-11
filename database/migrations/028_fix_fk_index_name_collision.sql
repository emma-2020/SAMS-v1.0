-- 028_fix_fk_index_name_collision.sql
--
-- migration 025 (add_missing_foreign_key_indexes) intended to add single-
-- column indexes on fee_ledger.player_id and player_documents.player_id,
-- but used CREATE INDEX IF NOT EXISTS with names that collided with
-- pre-existing COMPOSITE indexes from migration 016
-- (idx_fee_ledger_player_id / idx_player_documents_player_id, both on
-- (academy_id, player_id)) — so both statements silently no-op'd.
--
-- A composite index with player_id as the second column doesn't serve a
-- lookup on player_id alone (B-tree leading-column rule), which is exactly
-- what a foreign-key CASCADE DELETE check needs. Confirmed via a fresh
-- advisor run after 025 shipped: both are still flagged as unindexed FKs.
-- Using distinct names this time to avoid the same silent-collision trap.

CREATE INDEX IF NOT EXISTS idx_fee_ledger_player_id_fk ON public.fee_ledger(player_id);
CREATE INDEX IF NOT EXISTS idx_player_documents_player_id_fk ON public.player_documents(player_id);
