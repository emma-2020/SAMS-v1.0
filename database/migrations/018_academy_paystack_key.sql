-- Migration 018: Per-academy Paystack secret key
-- Run in Supabase SQL Editor after 017

ALTER TABLE academies
  ADD COLUMN IF NOT EXISTS paystack_secret_key TEXT;
