// src/services/auth.service.js
'use strict';

/**
 * AuthService
 * -----------
 * All authentication business logic lives here.
 *
 * Security fixes applied:
 *   F-02  Global email uniqueness enforced before auth.admin.createUser —
 *         prevents two academy rows sharing the same Supabase Auth UUID,
 *         which would make auth_academy_id() RLS resolver indeterminate.
 *   F-07  Raw Supabase error strings are logged server-side only;
 *         generic messages are returned to the client.
 */

const { supabaseAdmin } = require('../config/supabase');
const {
  ConflictError,
  UnauthorizedError,
  InternalError,
  NotFoundError,
} = require('../utils/errors');
const {
  validateSignupPayload,
  validateLoginPayload,
  sanitizeString,
} = require('../utils/validators');

// ─────────────────────────────────────────────────────────────────
// SIGNUP
// ─────────────────────────────────────────────────────────────────

async function signup({ email, password, role, first_name, last_name, academy_id }) {
  validateSignupPayload({ email, password, role, first_name, last_name });

  const cleanEmail = sanitizeString(email, { lowercase: true });

  // 1. Verify the academy exists
  const { data: academy, error: academyError } = await supabaseAdmin
    .from('academies')
    .select('id')
    .eq('id', academy_id)
    .single();

  if (academyError || !academy) {
    throw new NotFoundError('Academy not found. Provide a valid academy_id.');
  }

  // 2. F-02 FIX: Enforce GLOBAL email uniqueness across all academies.
  //    A single Supabase Auth UUID must never appear in more than one
  //    academy row — otherwise auth_academy_id() returns an indeterminate
  //    result and RLS tenant isolation is broken.
  const { data: globalUser } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('email', cleanEmail)
    .maybeSingle();                          // no academy_id filter — intentionally global

  if (globalUser) {
    throw new ConflictError(
      'This email address is already registered in the platform. ' +
      'Each user requires a unique email address across all academies.'
    );
  }

  // 3. Create the Supabase Auth user
  const { data: authData, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
    email:         cleanEmail,
    password,
    email_confirm: true,
    user_metadata: {
      academy_id,
      role,
      first_name: sanitizeString(first_name),
      last_name:  sanitizeString(last_name),
    },
  });

  if (signUpError) {
    // F-07: Log internally, return a safe message to the client
    console.error('[AuthService.signup] createUser failed:', signUpError.message);
    if (signUpError.message.toLowerCase().includes('already')) {
      throw new ConflictError('This email address is already registered.');
    }
    throw new InternalError('Account creation failed. Please try again.');
  }

  const authUserId = authData.user.id;

  // 4. Insert application-level profile
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('users')
    .insert({
      id:            authUserId,
      academy_id,
      email:         cleanEmail,
      password_hash: 'managed_by_supabase_auth',
      role,
      first_name:    sanitizeString(first_name),
      last_name:     sanitizeString(last_name),
    })
    .select('id, academy_id, email, role, first_name, last_name, created_at')
    .single();

  if (profileError) {
    // Roll back the auth user to prevent an orphaned record
    await supabaseAdmin.auth.admin.deleteUser(authUserId);
    // F-07: Log internally, return safe message
    console.error('[AuthService.signup] profile insert failed:', profileError.message);
    throw new InternalError('Account setup failed. Please try again.');
  }

  return { profile, message: 'Account created successfully. Please log in.' };
}


// ─────────────────────────────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────────────────────────────

async function login({ email, password, academy_id }) {
  validateLoginPayload({ email, password });

  const cleanEmail = sanitizeString(email, { lowercase: true });

  const { data: authData, error: authError } =
    await supabaseAdmin.auth.signInWithPassword({ email: cleanEmail, password });

  if (authError || !authData.session) {
    // Deliberately vague — never reveal which field was wrong
    throw new UnauthorizedError('Invalid email or password.');
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('users')
    .select('id, academy_id, email, role, first_name, last_name, created_at, is_active')
    .eq('id', authData.user.id)
    .eq('academy_id', academy_id)            // tenant guard
    .single();

  if (profileError || !profile) {
    throw new UnauthorizedError('Account not found in this academy.');
  }

  if (profile.is_active === false) {
    throw new UnauthorizedError('This account has been deactivated.');
  }

  const { is_active, ...safeProfile } = profile;

  return {
    session: {
      access_token:  authData.session.access_token,
      refresh_token: authData.session.refresh_token,
      expires_in:    authData.session.expires_in,
      token_type:    'Bearer',
    },
    profile: safeProfile,
  };
}


// ─────────────────────────────────────────────────────────────────
// LOGOUT
// ─────────────────────────────────────────────────────────────────

async function logout(accessToken) {
  const { error } = await supabaseAdmin.auth.admin.signOut(accessToken);
  if (error) {
    // Non-fatal — token may already be expired
    console.warn('[AuthService.logout] sign-out warning:', error.message);
  }
}


// ─────────────────────────────────────────────────────────────────
// GET CURRENT USER (me)
// ─────────────────────────────────────────────────────────────────

async function getMe(userId, academyId) {
  const { data: profile, error } = await supabaseAdmin
    .from('users')
    .select('id, academy_id, email, role, first_name, last_name, created_at')
    .eq('id', userId)
    .eq('academy_id', academyId)
    .single();

  if (error || !profile) {
    throw new NotFoundError('User profile not found.');
  }

  return profile;
}


// ─────────────────────────────────────────────────────────────────
// REFRESH TOKEN
// ─────────────────────────────────────────────────────────────────

async function refreshSession(refreshToken) {
  if (!refreshToken) {
    throw new UnauthorizedError('Refresh token is required.');
  }

  const { data, error } = await supabaseAdmin.auth.refreshSession({
    refresh_token: refreshToken,
  });

  if (error || !data.session) {
    throw new UnauthorizedError('Refresh token is invalid or expired. Please log in again.');
  }

  return {
    access_token:  data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_in:    data.session.expires_in,
    token_type:    'Bearer',
  };
}

module.exports = { signup, login, logout, getMe, refreshSession };
