-- Migration 009: Platform admin MFA (TOTP)
-- Run in Supabase SQL Editor after 008_chat_security.sql
-- Adds TOTP columns to platform_admins table

ALTER TABLE platform_admins
  ADD COLUMN IF NOT EXISTS totp_secret TEXT,
  ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN platform_admins.totp_secret IS 'Base32 TOTP secret. Set during MFA setup, cleared if MFA is disabled.';
COMMENT ON COLUMN platform_admins.mfa_enabled  IS 'TRUE = TOTP required at every login after password check.';
