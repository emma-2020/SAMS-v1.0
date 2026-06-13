// src/config/env.js
'use strict';

require('dotenv').config();

const REQUIRED_VARS = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_KEY',
  'SUPABASE_ANON_KEY',
  'SUPABASE_JWT_SECRET',
  'PORT',
];

const missing = REQUIRED_VARS.filter((key) => !process.env[key]);
if (missing.length > 0) {
  throw new Error(
    `[config/env] Missing required environment variables: ${missing.join(', ')}`
  );
}

module.exports = {
  NODE_ENV:             process.env.NODE_ENV || 'development',
  PORT:                 parseInt(process.env.PORT, 10) || 4000,
  SUPABASE_URL:         process.env.SUPABASE_URL,
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY,
  SUPABASE_ANON_KEY:    process.env.SUPABASE_ANON_KEY,
  SUPABASE_JWT_SECRET:  process.env.SUPABASE_JWT_SECRET,
  FRONTEND_URL:  process.env.FRONTEND_URL  || 'http://localhost:3001',
  MARKETING_URL: process.env.MARKETING_URL || 'http://localhost:3000',
  // Email — Resend
  RESEND_API_KEY: process.env.RESEND_API_KEY || '',
  EMAIL_FROM:     process.env.EMAIL_FROM     || 'SAMS Platform <onboarding@resend.dev>',
};
