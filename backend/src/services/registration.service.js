'use strict';

const crypto = require('crypto');
const { supabaseAdmin } = require('../config/supabase');
const env = require('../config/env');
const {
  BadRequestError,
  ConflictError,
  NotFoundError,
  ForbiddenError,
  InternalError,
} = require('../utils/errors');
const {
  sendRegistrationSubmittedEmail,
  sendRegistrationAlertEmail,
  sendRegistrationApprovedEmail,
  sendRegistrationRejectedEmail,
} = require('./email.service');

const BUCKET = 'registration-documents';
const ALLOWED_DOC_MIME = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_DOC_SIZE = 10 * 1024 * 1024; // 10 MB

// ─── Upload a registration document to Supabase Storage ──────────────────────

async function uploadDocument({ academyId, playerId, docType, buffer, mimetype, originalName }) {
  if (!ALLOWED_DOC_MIME.includes(mimetype)) {
    throw new BadRequestError('Only JPEG, PNG, WebP, or PDF files are allowed.');
  }
  if (buffer.length > MAX_DOC_SIZE) {
    throw new BadRequestError('File size must be 10 MB or less.');
  }

  const ext = originalName.split('.').pop()?.toLowerCase() || 'bin';
  const fileName = `${academyId}/${playerId}/${docType}-${Date.now()}.${ext}`;

  const { error } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(fileName, buffer, { contentType: mimetype, upsert: true });

  if (error) {
    console.error('[RegistrationService.uploadDocument] storage error:', error.message);
    throw new InternalError('Document upload failed. Please try again.');
  }

  return fileName; // return storage path, not full URL
}

// ─── Generate a short-lived signed URL for a stored document ─────────────────

async function getSignedUrl(storagePath) {
  if (!storagePath) return null;
  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 3600); // 1-hour link
  if (error) return null;
  return data?.signedUrl ?? null;
}

// ─── Resolve signed URLs for all document fields in a registration row ────────

async function resolveDocumentUrls(reg) {
  const [birthCert, passportPhoto, nationalId, parentConsent] = await Promise.all([
    getSignedUrl(reg.birth_certificate_path),
    getSignedUrl(reg.passport_photo_path),
    getSignedUrl(reg.national_id_path),
    getSignedUrl(reg.parent_consent_path),
  ]);
  return {
    ...reg,
    birth_certificate_url: birthCert,
    passport_photo_url: passportPhoto,
    national_id_url: nationalId,
    parent_consent_url: parentConsent,
  };
}

// ─── PLAYER: Save draft (create or update) ───────────────────────────────────

async function saveDraft({ playerId, academyId, fields }) {
  // Check if a record already exists
  const { data: existing } = await supabaseAdmin
    .from('player_registrations')
    .select('id, status')
    .eq('academy_id', academyId)
    .eq('player_id', playerId)
    .maybeSingle();

  if (existing && existing.status === 'approved') {
    throw new ForbiddenError('Your registration is already approved.');
  }
  if (existing && existing.status === 'submitted') {
    throw new ForbiddenError('Your registration is already submitted and under review.');
  }

  if (existing) {
    // Update existing draft/rejected record
    const { data, error } = await supabaseAdmin
      .from('player_registrations')
      .update({ ...fields, status: 'draft' })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) throw new InternalError('Failed to save draft: ' + error.message);
    return data;
  } else {
    // Create new record
    const { data, error } = await supabaseAdmin
      .from('player_registrations')
      .insert({ academy_id: academyId, player_id: playerId, ...fields, status: 'draft' })
      .select()
      .single();

    if (error) throw new InternalError('Failed to save draft: ' + error.message);
    return data;
  }
}

// ─── Validate required fields before submission ───────────────────────────────

function validateRequiredFields(fields) {
  const missing = [];
  if (!fields.date_of_birth) missing.push('Date of birth');
  if (!fields.phone?.trim()) missing.push('Phone number');
  if (!fields.address?.trim()) missing.push('Address');
  if (!fields.position?.trim()) missing.push('Playing position');
  if (!fields.emergency_contact_name?.trim()) missing.push('Emergency contact name');
  if (!fields.emergency_contact_phone?.trim()) missing.push('Emergency contact phone');
  if (!fields.emergency_contact_relationship?.trim()) missing.push('Emergency contact relationship');
  if (missing.length) {
    throw new BadRequestError(`The following required fields are missing: ${missing.join(', ')}.`);
  }
}

// ─── PLAYER: Submit registration ──────────────────────────────────────────────

async function submitRegistration({ playerId, academyId, fields }) {
  const { data: existing } = await supabaseAdmin
    .from('player_registrations')
    .select('id, status')
    .eq('academy_id', academyId)
    .eq('player_id', playerId)
    .maybeSingle();

  if (existing?.status === 'approved') {
    throw new ForbiddenError('Your registration is already approved.');
  }
  if (existing?.status === 'submitted') {
    throw new ConflictError('Your registration is already submitted and under review.');
  }

  validateRequiredFields(fields);

  const payload = {
    ...fields,
    status: 'submitted',
    submitted_at: new Date().toISOString(),
    rejection_reason: null,
    reviewed_by: null,
    reviewed_at: null,
  };

  let registration;
  if (existing) {
    const { data, error } = await supabaseAdmin
      .from('player_registrations')
      .update(payload)
      .eq('id', existing.id)
      .select()
      .single();
    if (error) throw new InternalError('Submission failed: ' + error.message);
    registration = data;
  } else {
    const { data, error } = await supabaseAdmin
      .from('player_registrations')
      .insert({ academy_id: academyId, player_id: playerId, ...payload })
      .select()
      .single();
    if (error) throw new InternalError('Submission failed: ' + error.message);
    registration = data;
  }

  // Fetch player + academy info for emails
  const { data: player } = await supabaseAdmin
    .from('users')
    .select('first_name, last_name, email')
    .eq('id', playerId)
    .single();

  const { data: academy } = await supabaseAdmin
    .from('academies')
    .select('name')
    .eq('id', academyId)
    .single();

  const dashboardUrl = `${env.FRONTEND_URL || 'https://app.playsams.com'}/dashboard/player/registration`;
  const reviewUrl = `${env.FRONTEND_URL || 'https://app.playsams.com'}/dashboard/admin/registrations`;

  // Email player: submission receipt
  sendRegistrationSubmittedEmail({
    to: player.email,
    firstName: player.first_name,
    academyName: academy.name,
    dashboardUrl,
  }).catch(err => console.error('[RegistrationService] player email error:', err.message));

  // Email all admins: alert
  const { data: admins } = await supabaseAdmin
    .from('users')
    .select('first_name, email')
    .eq('academy_id', academyId)
    .eq('role', 'Admin')
    .eq('is_active', true);

  for (const admin of admins || []) {
    sendRegistrationAlertEmail({
      to: admin.email,
      adminName: admin.first_name,
      playerName: `${player.first_name} ${player.last_name}`,
      playerEmail: player.email,
      academyName: academy.name,
      reviewUrl,
    }).catch(err => console.error('[RegistrationService] admin email error:', err.message));
  }

  return registration;
}

// ─── PLAYER: Get own registration ─────────────────────────────────────────────

async function getMyRegistration({ playerId, academyId }) {
  const { data, error } = await supabaseAdmin
    .from('player_registrations')
    .select('*')
    .eq('academy_id', academyId)
    .eq('player_id', playerId)
    .maybeSingle();

  if (error) throw new InternalError('Failed to load registration: ' + error.message);
  return data; // null if no record exists yet
}

// ─── ADMIN: List registrations ────────────────────────────────────────────────

async function listRegistrations({ academyId, status }) {
  let query = supabaseAdmin
    .from('player_registrations')
    .select(`
      id, player_id, status, submitted_at, created_at, updated_at,
      position, date_of_birth,
      users!player_id (first_name, last_name, email, avatar_url)
    `)
    .eq('academy_id', academyId)
    .order('submitted_at', { ascending: false });

  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) throw new InternalError('Failed to list registrations: ' + error.message);
  return data ?? [];
}

// ─── ADMIN: Get single registration (full detail) ─────────────────────────────

async function getRegistration({ id, academyId }) {
  const { data, error } = await supabaseAdmin
    .from('player_registrations')
    .select(`
      *,
      users!player_id (first_name, last_name, email, avatar_url),
      reviewer:users!reviewed_by (first_name, last_name)
    `)
    .eq('id', id)
    .eq('academy_id', academyId)
    .single();

  if (error || !data) throw new NotFoundError('Registration not found.');

  return resolveDocumentUrls(data);
}

// ─── ADMIN: Approve ───────────────────────────────────────────────────────────

async function approveRegistration({ id, adminId, academyId }) {
  const { data: reg, error: fetchErr } = await supabaseAdmin
    .from('player_registrations')
    .select('*, users!player_id (first_name, email)')
    .eq('id', id)
    .eq('academy_id', academyId)
    .single();

  if (fetchErr || !reg) throw new NotFoundError('Registration not found.');
  if (reg.status === 'approved') throw new ConflictError('Registration is already approved.');
  if (reg.status !== 'submitted') throw new BadRequestError('Only submitted registrations can be approved.');

  const { data, error } = await supabaseAdmin
    .from('player_registrations')
    .update({
      status: 'approved',
      reviewed_by: adminId,
      reviewed_at: new Date().toISOString(),
      rejection_reason: null,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new InternalError('Approval failed: ' + error.message);

  const { data: academy } = await supabaseAdmin
    .from('academies')
    .select('name')
    .eq('id', academyId)
    .single();

  const dashboardUrl = `${env.FRONTEND_URL || 'https://app.playsams.com'}/dashboard/player`;

  sendRegistrationApprovedEmail({
    to: reg.users.email,
    firstName: reg.users.first_name,
    academyName: academy.name,
    dashboardUrl,
  }).catch(err => console.error('[RegistrationService] approval email error:', err.message));

  return data;
}

// ─── ADMIN: Reject ────────────────────────────────────────────────────────────

async function rejectRegistration({ id, adminId, academyId, reason }) {
  if (!reason?.trim()) throw new BadRequestError('A rejection reason is required.');

  const { data: reg, error: fetchErr } = await supabaseAdmin
    .from('player_registrations')
    .select('*, users!player_id (first_name, email)')
    .eq('id', id)
    .eq('academy_id', academyId)
    .single();

  if (fetchErr || !reg) throw new NotFoundError('Registration not found.');
  if (reg.status === 'rejected') throw new ConflictError('Registration is already rejected.');
  if (reg.status !== 'submitted') throw new BadRequestError('Only submitted registrations can be rejected.');

  const { data, error } = await supabaseAdmin
    .from('player_registrations')
    .update({
      status: 'rejected',
      reviewed_by: adminId,
      reviewed_at: new Date().toISOString(),
      rejection_reason: reason.trim(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new InternalError('Rejection failed: ' + error.message);

  const { data: academy } = await supabaseAdmin
    .from('academies')
    .select('name')
    .eq('id', academyId)
    .single();

  const dashboardUrl = `${env.FRONTEND_URL || 'https://app.playsams.com'}/dashboard/player/registration`;

  sendRegistrationRejectedEmail({
    to: reg.users.email,
    firstName: reg.users.first_name,
    academyName: academy.name,
    reason: reason.trim(),
    dashboardUrl,
  }).catch(err => console.error('[RegistrationService] rejection email error:', err.message));

  return data;
}

// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  uploadDocument,
  saveDraft,
  submitRegistration,
  getMyRegistration,
  listRegistrations,
  getRegistration,
  approveRegistration,
  rejectRegistration,
};
