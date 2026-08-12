'use strict';

const { supabaseAdmin, supabaseAnon } = require('../config/supabase');
const {
  BadRequestError,
  ConflictError,
  UnauthorizedError,
  ForbiddenError,
  InternalError,
  NotFoundError,
} = require('../utils/errors');
const {
  validateLoginPayload,
  validatePasswordChange,
  sanitizeString,
  validateDateOfBirth,
  validateTermsAccepted,
} = require('../utils/validators');
const audit = require('./audit.service');

// Placeholder legal text version accepted at signup. Bump this when real
// legal copy replaces the /terms and /privacy placeholder pages.
const TERMS_VERSION = 'v1-draft';

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
const notif        = require('./notifications.service');
const emailService = require('./email.service');

// ─────────────────────────────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────────────────────────────

async function login({ email, password, academy_id, ip }) {
  validateLoginPayload({ email, password });

  const cleanEmail = sanitizeString(email, { lowercase: true });

  // Check per-account lockout BEFORE hitting Supabase Auth
  checkLockout(cleanEmail);

  // Use supabaseAnon (not supabaseAdmin) for signIn — signInWithPassword mutates the
  // client's in-memory session, which would corrupt the shared service-role singleton
  // and cause platform_admins RLS reads to fail for the lifetime of the process.
  const { data: authData, error: authError } =
    await supabaseAnon.auth.signInWithPassword({ email: cleanEmail, password });

  if (authError || !authData.session) {
    recordFailure(cleanEmail);
    audit.authLoginFailed({ email: cleanEmail, academy_id, ip, reason: 'bad_credentials' });
    throw new UnauthorizedError('Invalid email or password.');
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('users')
    .select('id, academy_id, email, role, first_name, last_name, avatar_url, created_at, is_active, academies(name, logo_url)')
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

  const { is_active, academies, ...safeProfile } = profile;

  return {
    session: {
      access_token:  authData.session.access_token,
      refresh_token: authData.session.refresh_token,
      expires_in:    authData.session.expires_in,
      token_type:    'Bearer',
    },
    profile: {
      ...safeProfile,
      academy_name: academies?.name ?? null,
      logo_url:     academies?.logo_url ?? null,
    },
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
    .select('id, academy_id, email, role, first_name, last_name, avatar_url, created_at, academies(name, logo_url)')
    .eq('id', userId)
    .eq('academy_id', academyId)
    .single();

  if (error || !profile) {
    throw new NotFoundError('User profile not found.');
  }

  const { academies, ...profileData } = profile;
  return {
    ...profileData,
    academy_name: academies?.name ?? null,
    logo_url:     academies?.logo_url ?? null,
  };
}


// ─────────────────────────────────────────────────────────────────
// REFRESH TOKEN
// ─────────────────────────────────────────────────────────────────

async function refreshSession(refreshToken) {
  if (!refreshToken) {
    throw new UnauthorizedError('Refresh token is required.');
  }

  // Use supabaseAnon for session refresh — same reason as signInWithPassword above.
  const { data, error } = await supabaseAnon.auth.refreshSession({
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

async function registerByInvitation({ token, password, date_of_birth, terms_accepted }) {
  if (!password || password.length < 8) {
    throw new BadRequestError('Password must be at least 8 characters.');
  }

  // Terms of Service / Privacy Policy consent — the one required piece of
  // this feature. date_of_birth stays optional (never throws when omitted).
  validateTermsAccepted(terms_accepted);
  const dob = validateDateOfBirth(date_of_birth);

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
    // Supabase rejects duplicate emails at the auth layer independently of our own
    // `existingUser` pre-check above — a profile row can lag behind the auth user
    // (e.g. another signup/approval flow claimed the email a moment earlier). Surface
    // the same friendly conflict message instead of a generic, unactionable error.
    const isDuplicateEmail = createError.status === 422 ||
      /already registered|already exists|email_exists/i.test(createError.message || '');
    if (isDuplicateEmail) {
      throw new ConflictError('An account with this email already exists. Please log in.');
    }
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
      date_of_birth: dob,
      terms_accepted_at: new Date().toISOString(),
      terms_version: TERMS_VERSION,
    })
    .select('id, academy_id, email, role, first_name, last_name, avatar_url, created_at, date_of_birth, terms_accepted_at, terms_version')
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

  // Sign them in immediately so they get a live session.
  // Use supabaseAnon — same reason as in login(): signInWithPassword mutates the
  // client's in-memory session and would corrupt the service-role singleton.
  const { data: sessionData, error: sessionError } =
    await supabaseAnon.auth.signInWithPassword({ email, password });

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

// ─────────────────────────────────────────────────────────────────
// SETUP ACCOUNT  (public — no prior auth)
// Called after a new academy admin clicks the invite link in their
// approval email. Validates the Supabase invite token, sets the
// chosen password, and signs the user in — returning a live session.
// ─────────────────────────────────────────────────────────────────

async function setupAccount({ token, password }) {
  if (!token) throw new BadRequestError('Setup token is required.');
  validatePasswordChange(password);

  // Verify the Supabase invite/recovery token
  const { data: { user }, error: userErr } = await supabaseAdmin.auth.getUser(token);
  if (userErr || !user) {
    throw new UnauthorizedError('This setup link is invalid or has expired. Please contact support.');
  }

  // Set the chosen password
  const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(user.id, { password });
  if (updateErr) {
    console.error('[AuthService.setupAccount] updateUserById failed:', updateErr.message);
    throw new InternalError('Failed to set password. Please try again.');
  }

  // Sign them in immediately so they get a live session.
  // Use supabaseAnon — same reason as in login().
  const { data: sessionData, error: sessionErr } =
    await supabaseAnon.auth.signInWithPassword({ email: user.email, password });
  if (sessionErr || !sessionData.session) {
    throw new InternalError('Password set successfully. Please log in at the login page.');
  }

  // Load the user profile
  const { data: profile, error: profileErr } = await supabaseAdmin
    .from('users')
    .select('id, academy_id, email, role, first_name, last_name, avatar_url, created_at')
    .eq('id', user.id)
    .single();

  if (profileErr || !profile) throw new NotFoundError('User profile not found.');

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
// FORGOT PASSWORD
// Generates a Supabase recovery link and emails it to the user.
// Always resolves (never throws) — we never reveal whether an
// email is registered to prevent enumeration attacks.
// ─────────────────────────────────────────────────────────────────

async function forgotPassword(email) {
  const cleanEmail = sanitizeString(email).toLowerCase();

  // Look up the user in our users table to get their first_name for the email
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id, email, first_name')
    .eq('email', cleanEmail)
    .maybeSingle();

  if (!user) return; // Silent — do not reveal whether email exists

  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: 'recovery',
    email: user.email,
    options: { redirectTo: 'https://app.playsams.com/reset-password' },
  });

  if (error) {
    console.error('[AuthService.forgotPassword] generateLink error:', error.message);
    return; // Silent failure — user still sees success message
  }

  // Fire-and-forget email — do not let email failure surface to caller
  emailService.sendPasswordResetEmail({
    to:        user.email,
    firstName: user.first_name || 'there',
    resetLink: data.properties.action_link,
  }).catch(e => console.error('[AuthService.forgotPassword] email error:', e.message));
}

// ─────────────────────────────────────────────────────────────────
// RESET PASSWORD
// Validates the Supabase recovery access_token and updates the
// user's password via the admin API.
// ─────────────────────────────────────────────────────────────────

async function resetPassword(accessToken, newPassword) {
  validatePasswordChange(newPassword);

  // Verify the recovery token and extract the user
  const { data: { user }, error: tokenError } =
    await supabaseAdmin.auth.getUser(accessToken);

  if (tokenError || !user) {
    throw new UnauthorizedError('Reset link is invalid or has expired. Please request a new one.');
  }

  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
    user.id,
    { password: newPassword }
  );

  if (updateError) {
    console.error('[AuthService.resetPassword] updateUserById error:', updateError.message);
    throw new InternalError('Failed to update password. Please try again.');
  }
}

// ─────────────────────────────────────────────────────────────────
// GET USER PREFERENCES
// ─────────────────────────────────────────────────────────────────

async function getPreferences({ userId, academyId }) {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('preferences')
    .eq('id', userId)
    .eq('academy_id', academyId)
    .single();

  if (error || !data) throw new NotFoundError('User preferences not found.');
  return data.preferences ?? {};
}

// ─────────────────────────────────────────────────────────────────
// UPDATE USER PREFERENCES
// Merges the incoming patch into the existing preferences JSONB.
// ─────────────────────────────────────────────────────────────────

async function updatePreferences({ userId, academyId, preferences }) {
  // First fetch current preferences so we can deep-merge
  const { data: current } = await supabaseAdmin
    .from('users')
    .select('preferences')
    .eq('id', userId)
    .eq('academy_id', academyId)
    .single();

  const merged = { ...(current?.preferences ?? {}), ...preferences };

  const { data, error } = await supabaseAdmin
    .from('users')
    .update({ preferences: merged })
    .eq('id', userId)
    .eq('academy_id', academyId)
    .select('preferences')
    .single();

  if (error || !data) {
    console.error('[AuthService.updatePreferences]', error?.message);
    throw new InternalError('Failed to save preferences.');
  }
  return data.preferences;
}

// ─────────────────────────────────────────────────────────────────
// EXPORT OWN DATA
// Self-service data export — a reasonably complete personal-data
// dump, not literally every row in every table. Role-aware: Player
// gets their wellness/attendance/training/registration/fee records,
// everyone gets their own profile and sent messages.
// ─────────────────────────────────────────────────────────────────

async function exportOwnData({ userId, academyId, role }) {
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('users')
    .select('id, email, role, first_name, last_name, date_of_birth, avatar_url, terms_accepted_at, terms_version, created_at')
    .eq('id', userId)
    .eq('academy_id', academyId)
    .single();

  if (profileError || !profile) throw new NotFoundError('Account not found.');

  const { data: sentMessages } = await supabaseAdmin
    .from('messages')
    .select('id, message_text, attachment_url, file_name, created_at')
    .eq('academy_id', academyId)
    .eq('sender_id', userId)
    .order('created_at', { ascending: false })
    .limit(500);

  const exportData = {
    exported_at: new Date().toISOString(),
    profile,
    sent_messages: sentMessages || [],
  };

  if (role === 'Player') {
    const [healthLogs, attendance, workoutCompletions, registration, documents, fees] = await Promise.all([
      supabaseAdmin.from('health_logs').select('id, fatigue, soreness, sleep_quality, notes, log_date, logged_at').eq('academy_id', academyId).eq('player_id', userId).order('log_date', { ascending: false }),
      supabaseAdmin.from('attendance').select('id, event_id, status, notes, updated_at').eq('academy_id', academyId).eq('player_id', userId).order('updated_at', { ascending: false }),
      supabaseAdmin.from('workout_completions').select('id, exercise_id, is_completed, completed_at').eq('academy_id', academyId).eq('player_id', userId).order('completed_at', { ascending: false }),
      supabaseAdmin.from('player_registrations').select('*').eq('academy_id', academyId).eq('player_id', userId).maybeSingle(),
      supabaseAdmin.from('player_documents').select('id, doc_type, file_name, created_at').eq('academy_id', academyId).eq('player_id', userId),
      supabaseAdmin.from('fee_ledger').select('id, description, amount_owed, amount_paid, created_at').eq('academy_id', academyId).eq('player_id', userId).order('created_at', { ascending: false }),
    ]);

    exportData.health_logs = healthLogs.data || [];
    exportData.attendance = attendance.data || [];
    exportData.workout_completions = workoutCompletions.data || [];
    exportData.registration = registration.data || null;
    exportData.documents = (documents.data || []).map((d) => ({ ...d, note: 'File contents are not included in this export — contact your Academy Administrator for a copy of the original file.' }));
    exportData.fees = fees.data || [];
  }

  if (role === 'Parent') {
    const { data: children } = await supabaseAdmin
      .from('rosters')
      .select('player_id, team_id, users!rosters_player_id_fkey(first_name, last_name)')
      .eq('academy_id', academyId)
      .eq('parent_id', userId);

    exportData.linked_children = (children || []).map((c) => ({
      player_id: c.player_id,
      team_id: c.team_id,
      player_name: c.users ? `${c.users.first_name} ${c.users.last_name}` : null,
    }));
  }

  return exportData;
}

// ─────────────────────────────────────────────────────────────────
// DELETE OWN ACCOUNT
// Self-service account deletion. Reuses the same hard-delete pattern
// as admin.controller.js's deleteMember (users row delete cascades
// via FK ON DELETE CASCADE across health_logs, attendance, messages,
// workouts, registrations, documents, etc.; Supabase Auth record
// deleted separately). Unlike deleteMember, this is scoped to the
// caller's own id, and Admin IS allowed to self-delete — guarded
// instead against deleting the last active Admin in an academy, which
// would orphan it, matching the guard already used by
// admin.service.js's setMemberStatus for deactivation.
// ─────────────────────────────────────────────────────────────────

async function deleteOwnAccount({ userId, academyId, role }) {
  if (role === 'Admin') {
    const { count, error: countErr } = await supabaseAdmin
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('academy_id', academyId)
      .eq('role', 'Admin')
      .eq('is_active', true);

    if (countErr) throw new InternalError('Failed to verify admin count.');
    if ((count ?? 0) <= 1) {
      throw new ForbiddenError('You are the only active Admin in this academy. Promote another Admin before deleting your account.');
    }
  }

  const { error: deleteError } = await supabaseAdmin.from('users').delete().eq('id', userId).eq('academy_id', academyId);
  if (deleteError) {
    console.error('[AuthService.deleteOwnAccount] users delete error:', deleteError.message);
    throw new InternalError('Failed to delete account. Please try again.');
  }

  const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (authError) {
    console.error('[AuthService.deleteOwnAccount] auth delete error:', authError.message);
    throw new InternalError('Account data was deleted but the login record could not be removed. Contact support.');
  }

  return { deleted: true };
}

module.exports = { login, logout, getMe, refreshSession, updateProfile, changePassword, verifyInviteToken, registerByInvitation, uploadAvatar, setupAccount, forgotPassword, resetPassword, getPreferences, updatePreferences, exportOwnData, deleteOwnAccount, TERMS_VERSION };
