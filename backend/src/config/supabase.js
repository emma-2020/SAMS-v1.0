// src/config/supabase.js
'use strict';

const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');
const env = require('./env');

/**
 * supabaseAdmin
 * Service-role client. Bypasses RLS entirely.
 * ONLY used server-side for privileged operations:
 *   - verifying JWTs          (auth.getUser)
 *   - creating auth users     (admin.createUser)
 *   - looking up user profiles during middleware
 * NEVER expose to frontend or return its key in any API response.
 */
const supabaseAdmin = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession:   false,
    },
    realtime: { transport: ws },
  }
);

/**
 * supabaseAnon
 * Anon-key client. Respects RLS policies.
 * Used for operations where the caller's row-level permissions apply.
 */
const supabaseAnon = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_ANON_KEY
);

module.exports = { supabaseAdmin, supabaseAnon };
