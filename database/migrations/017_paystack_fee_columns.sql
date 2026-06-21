-- Migration 017: Add Paystack payment columns to fee_ledger
-- Run in Supabase SQL Editor

-- Add Paystack columns
ALTER TABLE fee_ledger
  ADD COLUMN IF NOT EXISTS paystack_reference TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS payment_url        TEXT;

-- Extend payment_method to include 'Online' for Paystack-processed payments
ALTER TABLE fee_ledger
  DROP CONSTRAINT IF EXISTS fee_ledger_payment_method_check;

ALTER TABLE fee_ledger
  ADD CONSTRAINT fee_ledger_payment_method_check
  CHECK (payment_method IN ('Cash', 'MoMo', 'Bank', 'Online', 'Other'));
