'use strict';

const { supabaseAdmin } = require('../config/supabase');
const {
  BadRequestError,
  ConflictError,
  UnauthorizedError,
  InternalError,
  NotFoundError,
} = require('../utils/errors');
const {
  validateSignupPayload,
  validateLoginPayload,
  validatePasswordChange,
  sanitizeString,
} = require('../utils/validators');
const audit = require('./audit.service');

// ─── Per-account login lockout ────────────────────────────────────────────────
// In-memory store: email → { count, lockedUntil }
// For a multi-instance deployment replace with Redis.
const loginAttempts = new Map();
const MAX_ATTEMPTS  = 5;
const LOCKOUT_MS    = 15 * 60 * 1000; // 15 minutes

function checkLockout(email) {
  const entry = loginAttempts.get(email);
  if (!entry) return;
  if (entry.lockedUntil && Date.now() < entry.lockedUntil) {
    const mins = Math.ceil((entry.lockedUntil - Date.now()) / 60000);
    throw new UnauthorizedError(
      `Account temporarily locked due to too many failed attempts. Try again in ${mins} minute${mins !== 1 ? 's' : ''}.`
    );
  }
}

function recordFailure(email) {
  const entry = loginAttempts.get(email) ?? { count: 0, lockedUntil: null };
  entry.count += 1;
  if (entry.count >= MAX_ATTEMPTS) {
    entry.lockedUntil = Date.now() + LOCKOUT_MS;
  }
  loginAttempts.set(email, entry);
}

function clearFailures(email) {
  loginAttempts.delete(email);
}
const notif = require('./notifications.service');

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
    .select('id, academy_id, email, role, first_name, last_name, avatar_url, created_at')
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

async function login({ email, password, academy_id, ip }) {
  validateLoginPayload({ email, password });

  const cleanEmail = sanitizeString(email, { lowercase: true });

  // Check per-account lockout BEFORE hitting Supabase Auth
  checkLockout(cleanEmail);

  const { data: authData, error: authError } =
    await supabaseAdmin.auth.signInWithPassword({ email: cleanEmail, password });

  if (authError || !authData.session) {
    recordFailure(cleanEmail);
    audit.authLoginFailed({ email: cleanEmail, academy_id, ip, reason: 'bad_credentials' });
    throw new UnauthorizedError('Invalid email or password.');
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('users')
    .select('id, academy_id, email, role, first_name, last_name, avatar_url, created_at, is_active')
    .eq('id', authData.user.id)
    .eq('academy_id', academy_id)
    .single();

  if (profileError || !profile) {
    recordFailure(cleanEmail);
    audit.authLoginFailed({ email: cleanEmail, academy_id, ip, reason: 'wrong_academy' });
    throw new UnauthorizedError('Invalid email or password.');
  }

  if (profile.is_active === false) {
    audit.authLoginFailed({ email: cleanEmail, academy_id, ip, reason: 'account_deactivated' });
    throw new UnauthorizedError('This account has been deactivated. Contact your academy administrator.');
  }

  // Successful login — clear any prior failures and write audit event
  clearFailures(cleanEmail);
  audit.authLogin({ academy_id, actor_id: profile.id, actor_email: cleanEmail, actor_role: profile.role, ip });

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

async function logout(accessToken, { userId, email, academyId, ip } = {}) {
  const { error } = await supabaseAdmin.auth.admin.signOut(accessToken);
  if (error) {
    console.warn('[AuthService.logout] sign-out warning:', error.message);
  }
  audit.authLogout({ academy_id: academyId, actor_id: userId, actor_email: email, ip });
}


// ─────────────────────────────────────────────────────────────────
// GET CURRENT USER (me)
// ─────────────────────────────────────────────────────────────────

async function getMe(userId, academyId) {
  const { data: profile, error } = await supabaseAdmin
    .from('users')
    .select('id, academy_id, email, role, first_name, last_name, avatar_url, created_at')
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

// ─────────────────────────────────────────────────────────────────
// UPDATE PROFILE
// ─────────────────────────────────────────────────────────────────

async function updateProfile({ userId, academyId, first_name, last_name }) {
  const updates = {};
  if (first_name?.trim()) updates.first_name = sanitizeString(first_name);
  if (last_name?.trim())  updates.last_name  = sanitizeString(last_name);

  const { data, error } = await supabaseAdmin
    .from('users')
    .update(updates)
    .eq('id', userId)
    .eq('academy_id', academyId)
    .select('id, academy_id, email, role, first_name, last_name, avatar_url')
    .single();

  if (error || !data) {
    console.error('[AuthService.updateProfile]', error?.message);
    throw new InternalError('Profile update failed.');
  }
  return data;
}

// ─────────────────────────────────────────────────────────────────
// CHANGE PASSWORD
// ─────────────────────────────────────────────────────────────────

async function changePassword({ userId, email, academyId, newPassword, ip }) {
  validatePasswordChange(newPassword);
  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    password: newPassword,
  });
  if (error) {
    console.error('[AuthService.changePassword]', error.message);
    throw new InternalError('Password change failed. Please try again.');
  }
  audit.authPasswordChanged({ academy_id: academyId, actor_id: userId, actor_email: email, ip });
}

// ─────────────────────────────────────────────────────────────────
// VERIFY INVITE TOKEN  (public — no auth required)
// Returns the invitation details so the frontend can pre-fill the form.
// ─────────────────────────────────────────────────────────────────

async function verifyInviteToken(token) {
  if (!token || typeof token !== 'string' || token.length !== 64) {
    throw new NotFoundError('Invalid invitation link.');
  }

  const { data: invite, error } = await supabaseAdmin
    .from('invitations')
    .select(`
      id, email, role, first_name, last_name, expires_at, accepted_at,
      academies ( id, name )
    `)
    .eq('token', token)
    .maybeSingle();

  if (error || !invite) {
    throw new NotFoundError('Invitation not found.');
  }
  if (invite.accepted_at) {
    throw new ConflictError('This invitation has already been accepted.');
  }
  if (new Date(invite.expires_at) < new Date()) {
    throw new UnauthorizedError('This invitation has expired. Please ask your admin to resend it.');
  }

  return {
    email:       invite.email,
    first_name:  invite.first_name,
    last_name:   invite.last_name,
    role:        invite.role,
    academy_id:  invite.academies?.id,
    academy_name: invite.academies?.name,
    expires_at:  invite.expires_at,
  };
}


// ─────────────────────────────────────────────────────────────────
// REGISTER BY INVITATION
// Validates the token, creates the user, marks invitation accepted,
// then signs them in and returns a live session.
// ─────────────────────────────────────────────────────────────────

async function registerByInvitation({ token, password }) {
  if (!password || password.length < 8) {
    throw new BadRequestError('Password must be at least 8 characters.');
  }

  // Re-validate the token (guards against race conditions)
  const inviteDetails = await verifyInviteToken(token);
  const { email, first_name, last_name, role, academy_id } = inviteDetails;

  // Check global email uniqueness (same guard as signup)
  const { data: existingUser } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (existingUser) {
    throw new ConflictError('An account with this email already exists. Please log in.');
  }

  // Create Supabase Auth user
  const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { academy_id, role, first_name, last_name },
  });

  if (createError) {
    console.error('[AuthService.registerByInvitation] createUser failed:', createError.message);
    throw new InternalError('Account creation failed. Please try again.');
  }

  const authUserId = authData.user.id;

  // Insert application profile
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('users')
    .insert({
      id:            authUserId,
      academy_id,
      email,
      password_hash: 'managed_by_supabase_auth',
      role,
      first_name:    sanitizeString(first_name),
      last_name:     sanitizeString(last_name),
    })
    .select('id, academy_id, email, role, first_name, last_name, avatar_url, created_at')
    .single();

  if (profileError) {
    await supabaseAdmin.auth.admin.deleteUser(authUserId);
    console.error('[AuthService.registerByInvitation] profile insert failed:', profileError.message);
    throw new InternalError('Account setup failed. Please try again.');
  }

  // Mark invitation as accepted
  await supabaseAdmin
    .from('invitations')
    .update({ accepted_at: new Date().toISOString() })
    .eq('token', token);

  // Notify admins that the invitation was accepted
  notif.notifyStaff({
    academyId:  academy_id,
    type:       'invite',
    title:      `${first_name} ${last_name} joined as ${role}`,
    body:       `${email} accepted their invitation and created an account.`,
    link:       '/dashboard/admin/roster',
  });

  // Sign them in immediately so they get a live session
  const { data: sessionData, error: sessionError } =
    await supabaseAdmin.auth.signInWithPassword({ email, password });

  if (sessionError || !sessionData.session) {
    // Account created but auto-login failed — they can log in manually
    return { profile, session: null };
  }

  return {
    session: {
      access_token:  sessionData.session.access_token,
      refresh_token: sessionData.session.refresh_token,
      expires_in:    sessionData.session.expires_in,
      token_type:    'Bearer',
    },
    profile,
  };
}

// ─────────────────────────────────────────────────────────────────
// UPLOAD AVATAR
// Uploads image buffer to Supabase Storage and saves the public URL.
// ─────────────────────────────────────────────────────────────────

async function uploadAvatar({ userId, academyId, fileBuffer, mimetype, originalname }) {
  const ext      = originalname.split('.').pop().toLowerCase() || 'jpg';
  const fileName = `${userId}.${ext}`;

  const { error: uploadError } = await supabaseAdmin
    .storage
    .from('avatars')
    .upload(fileName, fileBuffer, {
      contentType:  mimetype,
      upsert:       true,
    });

  if (uploadError) {
    console.error('[AuthService.uploadAvatar] storage upload failed:', uploadError.message);
    throw new InternalError('Avatar upload failed. Please try again.');
  }

  const { data: { publicUrl } } = supabaseAdmin
    .storage
    .from('avatars')
    .getPublicUrl(fileName);

  const urlWithCacheBust = `${publicUrl}?t=${Date.now()}`;

  const { data: profile, error: updateError } = await supabaseAdmin
    .from('users')
    .update({ avatar_url: urlWithCacheBust })
    .eq('id', userId)
    .eq('academy_id', academyId)
    .select('id, academy_id, email, role, first_name, last_name, avatar_url')
    .single();

  if (updateError || !profile) {
    console.error('[AuthService.uploadAvatar] profile update failed:', updateError?.message);
    throw new InternalError('Failed to save avatar URL.');
  }

  return profile;
}

module.exports = { signup, login, logout, getMe, refreshSession, updateProfile, changePassword, verifyInviteToken, registerByInvitation, uploadAvatar };
