// src/services/admin.service.js
'use strict';

/**
 * AdminService
 * ─────────────
 * Academy administrator operations for V1.0.
 *
 * Invite flow:
 *   1. Admin POSTs { email, role, first_name, last_name }
 *   2. System checks the email is not already registered in this academy
 *   3. Creates a pending invitation record with a secure random token (64 hex chars)
 *   4. Sends an invitation email with a registration link
 *   5. Returns the invitation record (token never exposed in API response)
 *
 *   Invitees click the link → frontend calls POST /api/auth/signup
 *   with the token attached → signup service validates token + academy_id.
 *
 * V1.0 scope: Admin-only. Admins cannot be invited (must be seeded directly).
 */

const crypto      = require('crypto');
const { supabaseAdmin } = require('../config/supabase');
const env         = require('../config/env');
const {
  ConflictError,
  NotFoundError,
  ForbiddenError,
  InternalError,
} = require('../utils/errors');
const { sendInvitationEmail } = require('./email.service');

const INVITE_EXPIRY_HOURS = 72;     // invitations expire after 3 days
const INVITABLE_ROLES     = ['Coach', 'Player', 'Parent'];

// ─────────────────────────────────────────────────────────────────
// CREATE INVITATION
// ─────────────────────────────────────────────────────────────────

/**
 * createInvitation
 * Generates a secure invitation record for a new academy member.
 *
 * @param {object} options
 * @param {string} options.adminId      requesting admin user ID
 * @param {string} options.academyId
 * @param {string} options.email
 * @param {string} options.role         'Coach' | 'Player' | 'Parent'
 * @param {string} options.firstName
 * @param {string} options.lastName
 */
async function createInvitation({ adminId, academyId, email, role, firstName, lastName }) {

  // Guard: Admins cannot be invited via this flow
  if (!INVITABLE_ROLES.includes(role)) {
    throw new ForbiddenError(
      `Role "${role}" cannot be invited. Valid roles: ${INVITABLE_ROLES.join(', ')}.`
    );
  }

  const cleanEmail = email.trim().toLowerCase();

  // 1. Check for existing active user with this email in the academy
  const { data: existingUser } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('academy_id', academyId)              // tenant isolation
    .eq('email', cleanEmail)
    .maybeSingle();

  if (existingUser) {
    throw new ConflictError(
      `A user with email "${cleanEmail}" already exists in this academy.`
    );
  }

  // 2. Check for an existing pending (unexpired) invitation
  const { data: existingInvite } = await supabaseAdmin
    .from('invitations')
    .select('id, expires_at')
    .eq('academy_id', academyId)              // tenant isolation
    .eq('email', cleanEmail)
    .is('accepted_at', null)                  // not yet accepted
    .gt('expires_at', new Date().toISOString())  // not yet expired
    .maybeSingle();

  if (existingInvite) {
    throw new ConflictError(
      `An active invitation for "${cleanEmail}" already exists. ` +
      `It expires at ${existingInvite.expires_at}.`
    );
  }

  // 3. Generate a cryptographically secure token
  const token      = crypto.randomBytes(32).toString('hex');   // 64-char hex string
  const expiresAt  = new Date(
    Date.now() + INVITE_EXPIRY_HOURS * 60 * 60 * 1000
  ).toISOString();

  // 4. Fetch academy name for the email template (non-fatal — falls back to generic name
  //    if the academies table RLS policies are not yet applied).
  const { data: academy } = await supabaseAdmin
    .from('academies')
    .select('id, name')
    .eq('id', academyId)
    .maybeSingle();

  // 5. Insert invitation record
  const { data: invitation, error: insertError } = await supabaseAdmin
    .from('invitations')
    .insert({
      academy_id:  academyId,                 // tenant isolation on every insert
      invited_by:  adminId,
      email:       cleanEmail,
      role,
      first_name:  firstName.trim(),
      last_name:   lastName.trim(),
      token,                                  // stored for validation; never returned in API
      expires_at:  expiresAt,
    })
    .select('id, email, role, first_name, last_name, expires_at, created_at')
    .single();

  if (insertError) {
    throw new InternalError(`Invitation creation failed: ${insertError.message}`);
  }

  // 6. Dispatch invitation email (non-blocking — failure logs but doesn't 500)
  const registrationUrl = `${env.FRONTEND_URL}/register?token=${token}`;
  let emailSent = false;
  try {
    await sendInvitationEmail({
      to:          cleanEmail,
      firstName:   firstName.trim(),
      role,
      academyName: academy?.name ?? 'Your Academy',
      registrationUrl,
      expiresAt,
    });
    emailSent = true;
  } catch (emailErr) {
    console.error('[AdminService.createInvitation] Email dispatch failed:', emailErr.message);
  }

  // Always include the registration URL so admins can share it manually when email isn't configured.
  return { ...invitation, registration_url: registrationUrl, email_sent: emailSent };
}

// ─────────────────────────────────────────────────────────────────
// LIST INVITATIONS
// ─────────────────────────────────────────────────────────────────

/**
 * listInvitations
 * Returns all invitations for the academy, with optional status filter.
 *
 * @param {object}  options
 * @param {string}  options.academyId
 * @param {string}  [options.status]  'pending' | 'accepted' | 'expired'
 */
async function listInvitations({ academyId, status }) {
  let query = supabaseAdmin
    .from('invitations')
    .select(`
      id,
      email,
      role,
      first_name,
      last_name,
      accepted_at,
      expires_at,
      created_at,
      users!invitations_invited_by_fkey ( id, first_name, last_name )
    `)
    .eq('academy_id', academyId)              // tenant isolation
    .order('created_at', { ascending: false });

  const now = new Date().toISOString();

  if (status === 'pending') {
    query = query.is('accepted_at', null).gt('expires_at', now);
  } else if (status === 'accepted') {
    query = query.not('accepted_at', 'is', null);
  } else if (status === 'expired') {
    query = query.is('accepted_at', null).lt('expires_at', now);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[AdminService.listInvitations] fetch:', error.message);
    throw new InternalError('Failed to fetch invitations. Please try again.');
  }

  // Annotate computed status
  return (data || []).map((inv) => ({
    ...inv,
    computed_status: computeInviteStatus(inv),
  }));
}

// ─────────────────────────────────────────────────────────────────
// REVOKE INVITATION
// ─────────────────────────────────────────────────────────────────

/**
 * revokeInvitation
 * Hard-expires an invitation by setting its expiry to now.
 */
async function revokeInvitation({ invitationId, academyId }) {
  const { data, error } = await supabaseAdmin
    .from('invitations')
    .update({ expires_at: new Date().toISOString() })
    .eq('id', invitationId)
    .eq('academy_id', academyId)              // tenant isolation
    .is('accepted_at', null)                  // can't revoke already-accepted invites
    .select('id, email, expires_at')
    .single();

  if (error || !data) {
    throw new NotFoundError(
      'Invitation not found, already accepted, or does not belong to this academy.'
    );
  }

  return data;
}

// ─────────────────────────────────────────────────────────────────
// INTERNAL HELPERS
// ─────────────────────────────────────────────────────────────────

function computeInviteStatus(invitation) {
  if (invitation.accepted_at) return 'accepted';
  if (new Date(invitation.expires_at) < new Date()) return 'expired';
  return 'pending';
}

module.exports = { createInvitation, listInvitations, revokeInvitation };
