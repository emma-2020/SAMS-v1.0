'use strict';

const bcrypt = require('bcryptjs');
const { supabaseAdmin } = require('../config/supabase');
const { signPlatformToken, signMfaToken, verifyMfaToken } = require('../middleware/platformAuth.middleware');
const { generateSecret, generateSync, generateURI, verifySync } = require('otplib');
const QRCode = require('qrcode');
const {
  UnauthorizedError,
  NotFoundError,
  ConflictError,
  InternalError,
  BadRequestError,
} = require('../utils/errors');
const env = require('../config/env');
const crypto = require('crypto');
const {
  sendAcademyApprovalEmail,
  sendAcademyRejectionEmail,
  sendAcademyCredentialsEmail,
} = require('./email.service');

// Generates a secure temporary password that meets common password policies.
// Format: Sams + 4 uppercase + 4 digits + ! (e.g. SamsXKBZ4729!)
function generateTempPassword() {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const digits = '23456789';
  const b = crypto.randomBytes(8);
  const letters = Array.from(b.slice(0, 4)).map(n => upper[n % upper.length]).join('');
  const nums    = Array.from(b.slice(4, 8)).map(n => digits[n % digits.length]).join('');
  return `Sams${letters}${nums}!`;
}

// ─────────────────────────────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────────────────────────────

async function login(email, password) {
  if (!email || !password) {
    throw new BadRequestError('Email and password are required.');
  }

  // Retry up to 3 times to handle transient Supabase connection issues
  let admin = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    const { data, error } = await supabaseAdmin
      .from('platform_admins')
      .select('id, name, email, password_hash, is_active, mfa_enabled')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle();

    if (!error) { admin = data; break; }

    // PGRST116 = no rows — stop retrying, it's not a transient error
    if (error.code === 'PGRST116') break;

    // Transient error — wait and retry
    if (attempt < 3) await new Promise(r => setTimeout(r, 300 * attempt));
  }

  if (!admin) {
    throw new UnauthorizedError('Invalid credentials.');
  }

  if (!admin.is_active) {
    throw new UnauthorizedError('This platform admin account has been deactivated.');
  }

  const valid = await bcrypt.compare(password, admin.password_hash);
  if (!valid) throw new UnauthorizedError('Invalid credentials.');

  // stamp last_login_at (non-blocking — don't fail login if this errors)
  supabaseAdmin
    .from('platform_admins')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', admin.id)
    .then(() => {})
    .catch(() => {});

  // MFA enabled — return a short-lived challenge token instead of the full JWT.
  // The client must call POST /api/platform/mfa/verify with the TOTP code to
  // exchange the challenge token for a full access token.
  if (admin.mfa_enabled) {
    return { mfa_required: true, mfa_token: signMfaToken(admin.id) };
  }

  const token = signPlatformToken({ id: admin.id, name: admin.name, email: admin.email });
  return { token, admin: { id: admin.id, name: admin.name, email: admin.email } };
}

// ─────────────────────────────────────────────────────────────────
// MFA SETUP — generate TOTP secret + QR code
// Called by an authenticated platform admin who wants to enable MFA.
// ─────────────────────────────────────────────────────────────────

async function mfaSetup(adminId) {
  const { data: admin, error } = await supabaseAdmin
    .from('platform_admins')
    .select('id, email, mfa_enabled')
    .eq('id', adminId)
    .single();

  if (error || !admin) throw new NotFoundError('Platform admin not found.');
  if (admin.mfa_enabled) throw new ConflictError('MFA is already enabled for this account.');

  const secret  = generateSecret();
  const otpauth = generateURI({ secret, label: admin.email, issuer: 'SAMS Platform', type: 'totp' });
  const qrCode  = await QRCode.toDataURL(otpauth);

  // Persist the secret (not yet active — mfa_enabled stays false until confirmed)
  await supabaseAdmin
    .from('platform_admins')
    .update({ totp_secret: secret })
    .eq('id', adminId);

  return { secret, qrCode };
}

// ─────────────────────────────────────────────────────────────────
// MFA ENABLE — verify first TOTP code and activate MFA
// ─────────────────────────────────────────────────────────────────

function generateRecoveryCodes() {
  return Array.from({ length: 8 }, () => {
    const b = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `${b.slice(0, 4)}-${b.slice(4, 8)}`;
  });
}

async function findMatchingRecoveryCode(input, hashedCodes) {
  for (let i = 0; i < hashedCodes.length; i++) {
    if (await bcrypt.compare(input.toUpperCase(), hashedCodes[i])) return i;
  }
  return -1;
}

async function mfaEnable(adminId, totpCode) {
  const { data: admin, error } = await supabaseAdmin
    .from('platform_admins')
    .select('id, totp_secret, mfa_enabled')
    .eq('id', adminId)
    .single();

  if (error || !admin)    throw new NotFoundError('Platform admin not found.');
  if (!admin.totp_secret) throw new BadRequestError('MFA setup not initiated. Call /mfa/setup first.');
  if (admin.mfa_enabled)  throw new ConflictError('MFA is already enabled.');

  const result = verifySync({ token: totpCode, secret: admin.totp_secret });
  if (!result?.valid) throw new UnauthorizedError('Invalid authentication code. Please try again.');

  const plainCodes  = generateRecoveryCodes();
  const hashedCodes = await Promise.all(plainCodes.map(c => bcrypt.hash(c, 10)));

  await supabaseAdmin
    .from('platform_admins')
    .update({ mfa_enabled: true, recovery_codes: hashedCodes })
    .eq('id', adminId);

  return {
    message: 'MFA enabled successfully. Save these recovery codes — they will not be shown again.',
    recovery_codes: plainCodes,
  };
}

// ─────────────────────────────────────────────────────────────────
// MFA VERIFY — exchange MFA challenge token + TOTP code for full JWT
// ─────────────────────────────────────────────────────────────────

async function mfaVerify(mfaToken, totpCode, recoveryCode) {
  let payload;
  try {
    payload = verifyMfaToken(mfaToken);
  } catch {
    throw new UnauthorizedError('MFA session expired or invalid. Please log in again.');
  }

  const { data: admin, error } = await supabaseAdmin
    .from('platform_admins')
    .select('id, name, email, totp_secret, mfa_enabled, is_active, recovery_codes')
    .eq('id', payload.sub)
    .single();

  if (error || !admin)    throw new UnauthorizedError('Account not found.');
  if (!admin.is_active)   throw new UnauthorizedError('Account has been deactivated.');
  if (!admin.mfa_enabled) throw new BadRequestError('MFA is not enabled for this account.');
  if (!admin.totp_secret) throw new InternalError('MFA secret missing. Contact support.');

  if (recoveryCode) {
    const idx = await findMatchingRecoveryCode(recoveryCode, admin.recovery_codes || []);
    if (idx === -1) throw new UnauthorizedError('Invalid recovery code.');
    const remaining = (admin.recovery_codes || []).filter((_, i) => i !== idx);
    await supabaseAdmin.from('platform_admins').update({ recovery_codes: remaining }).eq('id', admin.id);
  } else {
    const result = verifySync({ token: totpCode, secret: admin.totp_secret });
    if (!result?.valid) throw new UnauthorizedError('Invalid authentication code. Please try again.');
  }

  const token = signPlatformToken({ id: admin.id, name: admin.name, email: admin.email });
  return { token, admin: { id: admin.id, name: admin.name, email: admin.email } };
}

// ─────────────────────────────────────────────────────────────────
// ENROLLMENT REQUESTS
// ─────────────────────────────────────────────────────────────────

async function listRequests(status = null) {
  let query = supabaseAdmin
    .from('platform_enrollment_requests')
    .select(`
      id, academy_name, contact_name, contact_email,
      sport, estimated_players, message,
      status, rejection_reason, reviewed_at,
      provisioned_academy_id, created_at,
      reviewer:platform_admins ( id, name, email )
    `)
    .order('created_at', { ascending: false });

  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) throw new InternalError('Failed to fetch enrollment requests.');
  return data || [];
}

async function getRequest(id) {
  const { data, error } = await supabaseAdmin
    .from('platform_enrollment_requests')
    .select(`
      id, academy_name, contact_name, contact_email,
      sport, estimated_players, message,
      status, rejection_reason, reviewed_at,
      provisioned_academy_id, created_at,
      reviewer:platform_admins ( id, name, email )
    `)
    .eq('id', id)
    .single();

  if (error || !data) throw new NotFoundError('Enrollment request not found.');
  return data;
}

// ─────────────────────────────────────────────────────────────────
// APPROVE — 4-step provisioning transaction
// 1. Create academy row
// 2. Create Supabase auth user (triggers confirmation email)
// 3. Create users profile row (role: Admin)
// 4. Mark request approved
// ─────────────────────────────────────────────────────────────────

async function approveRequest(requestId, platformAdminId) {
  const request = await getRequest(requestId);

  if (request.status !== 'pending') {
    throw new ConflictError(`Request is already ${request.status}.`);
  }

  // ── Step 1: Create the academy ────────────────────────────────
  const { data: academy, error: academyErr } = await supabaseAdmin
    .from('academies')
    .insert({
      name:      request.academy_name,
      is_active: true,
    })
    .select('id, name')
    .single();

  if (academyErr || !academy) {
    throw new InternalError('Failed to create academy record.');
  }

  // ── Step 2: Create Supabase auth user with a temp password ───
  // The Admin API never sends emails. We generate a temporary password,
  // send it to the admin in a credentials email, and ask them to change
  // it after first login.
  const tempPassword = generateTempPassword();
  const { data: authData, error: authErr } =
    await supabaseAdmin.auth.admin.createUser({
      email:         request.contact_email,
      password:      tempPassword,
      email_confirm: true,
      user_metadata: {
        role:        'Admin',
        academy_id:  academy.id,
        academy_name: academy.name,
      },
    });

  if (authErr || !authData?.user) {
    // Roll back the academy row to keep the DB clean
    await supabaseAdmin.from('academies').delete().eq('id', academy.id);
    if (authErr?.message?.includes('already registered')) {
      throw new ConflictError('A Supabase auth account already exists for this email.');
    }
    throw new InternalError('Failed to create auth user: ' + (authErr?.message || 'unknown'));
  }

  const authUser = authData.user;

  // ── Step 3: Create users profile row ──────────────────────────
  const nameParts  = request.contact_name.trim().split(' ');
  const firstName  = nameParts[0] || '';
  const lastName   = nameParts.slice(1).join(' ') || '';

  const { error: profileErr } = await supabaseAdmin
    .from('users')
    .insert({
      id:         authUser.id,
      academy_id: academy.id,
      email:      request.contact_email,
      role:       'Admin',
      first_name: firstName,
      last_name:  lastName,
      is_active:  true,
    });

  if (profileErr) {
    // Best-effort rollback
    await supabaseAdmin.auth.admin.deleteUser(authUser.id).catch(() => {});
    await supabaseAdmin.from('academies').delete().eq('id', academy.id).catch(() => {});
    throw new InternalError('Failed to create user profile: ' + profileErr.message);
  }

  // ── Step 4: Mark request approved ─────────────────────────────
  const { error: updateErr } = await supabaseAdmin
    .from('platform_enrollment_requests')
    .update({
      status:                  'approved',
      reviewed_by:             platformAdminId,
      reviewed_at:             new Date().toISOString(),
      provisioned_academy_id:  academy.id,
    })
    .eq('id', requestId);

  if (updateErr) throw new InternalError('Provisioning succeeded but failed to update request status.');

  const loginUrl = `${env.FRONTEND_URL}/login`;

  // ── Step 5: Send approval notification email (non-blocking) ──
  sendAcademyApprovalEmail({
    to:          request.contact_email,
    contactName: request.contact_name,
    academyName: academy.name,
    loginUrl,
  }).catch(err =>
    console.error('[PlatformService.approveRequest] Approval email failed:', err.message)
  );

  // ── Step 6: Send credentials email with login details (non-blocking) ──
  sendAcademyCredentialsEmail({
    to:           request.contact_email,
    contactName:  request.contact_name,
    academyName:  academy.name,
    academyId:    academy.id,
    loginEmail:   request.contact_email,
    tempPassword,
    loginUrl,
  }).catch(err =>
    console.error('[PlatformService.approveRequest] Credentials email failed:', err.message)
  );

  return {
    academy,
    admin_email: request.contact_email,
    message:     'Academy provisioned. Onboarding email dispatched to academy admin.',
  };
}

// ─────────────────────────────────────────────────────────────────
// REJECT
// ─────────────────────────────────────────────────────────────────

async function rejectRequest(requestId, platformAdminId, reason) {
  const request = await getRequest(requestId);

  if (request.status !== 'pending') {
    throw new ConflictError(`Request is already ${request.status}.`);
  }

  const { error } = await supabaseAdmin
    .from('platform_enrollment_requests')
    .update({
      status:           'rejected',
      rejection_reason: reason || null,
      reviewed_by:      platformAdminId,
      reviewed_at:      new Date().toISOString(),
    })
    .eq('id', requestId);

  if (error) throw new InternalError('Failed to reject request.');

  // Non-blocking: notify the applicant of the outcome
  sendAcademyRejectionEmail({
    to:          request.contact_email,
    contactName: request.contact_name,
    academyName: request.academy_name,
    reason:      reason || null,
    enrollUrl:   `${env.FRONTEND_URL}/enroll`,
  }).catch(err =>
    console.error('[PlatformService.rejectRequest] Rejection email failed:', err.message)
  );

  return { message: 'Request rejected.' };
}

// ─────────────────────────────────────────────────────────────────
// LIST ALL ACADEMIES
// ─────────────────────────────────────────────────────────────────

async function listAcademies() {
  const { data: academies, error } = await supabaseAdmin
    .from('academies')
    .select('id, name, is_active, created_at')
    .order('created_at', { ascending: false });

  if (error) throw new InternalError('Failed to fetch academies.');

  // Fetch member counts in one extra query
  const { data: counts } = await supabaseAdmin
    .from('users')
    .select('academy_id')
    .in('academy_id', (academies || []).map(a => a.id))
    .eq('is_active', true);

  const countMap = {};
  (counts || []).forEach(u => {
    countMap[u.academy_id] = (countMap[u.academy_id] || 0) + 1;
  });

  return (academies || []).map(a => ({
    ...a,
    member_count: countMap[a.id] || 0,
  }));
}

// ─────────────────────────────────────────────────────────────────
// PLATFORM STATS (for dashboard KPIs)
// ─────────────────────────────────────────────────────────────────

async function getStats() {
  const [academiesRes, requestsRes] = await Promise.all([
    supabaseAdmin.from('academies').select('id, is_active'),
    supabaseAdmin.from('platform_enrollment_requests').select('id, status, created_at'),
  ]);

  const academies = academiesRes.data || [];
  const requests  = requestsRes.data  || [];

  const now       = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  return {
    total_academies:       academies.length,
    active_academies:      academies.filter(a => a.is_active).length,
    pending_requests:      requests.filter(r => r.status === 'pending').length,
    approved_this_month:   requests.filter(r => r.status === 'approved' && r.created_at >= monthStart).length,
    total_requests:        requests.length,
  };
}

// ─────────────────────────────────────────────────────────────────
// SEED HELPER — create the first platform admin
// Called manually via a one-time script, not exposed via API.
// ─────────────────────────────────────────────────────────────────

async function createPlatformAdmin(name, email, password) {
  const existing = await supabaseAdmin
    .from('platform_admins')
    .select('id')
    .eq('email', email.toLowerCase())
    .single();

  if (existing.data) throw new ConflictError('Platform admin with this email already exists.');

  const password_hash = await bcrypt.hash(password, 12);

  const { data, error } = await supabaseAdmin
    .from('platform_admins')
    .insert({ name, email: email.toLowerCase(), password_hash })
    .select('id, name, email')
    .single();

  if (error) throw new InternalError('Failed to create platform admin.');
  return data;
}

module.exports = {
  login,
  mfaSetup,
  mfaEnable,
  mfaVerify,
  listRequests,
  getRequest,
  approveRequest,
  rejectRequest,
  listAcademies,
  getStats,
  createPlatformAdmin,
};
