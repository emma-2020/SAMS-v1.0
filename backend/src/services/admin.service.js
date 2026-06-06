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
const nodemailer  = require('nodemailer');
const { supabaseAdmin } = require('../config/supabase');
const env         = require('../config/env');
const {
  ConflictError,
  NotFoundError,
  ForbiddenError,
  InternalError,
} = require('../utils/errors');

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
// EMAIL DISPATCH
// ─────────────────────────────────────────────────────────────────

/**
 * sendInvitationEmail
 * Sends a styled HTML invitation email via nodemailer.
 * Requires SMTP_HOST, SMTP_USER, SMTP_PASS in .env.
 * Falls back to console logging in development if SMTP is not configured.
 */
async function sendInvitationEmail({ to, firstName, role, academyName, registrationUrl, expiresAt }) {

  const roleColors = { Admin:'#7C3AED', Coach:'#2563EB', Player:'#059669', Parent:'#D97706' };
  const roleColor  = roleColors[role] || '#6366F1';
  const expiryDate = new Date(expiresAt).toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You've been invited to ${academyName}</title>
</head>
<body style="margin:0;padding:0;background:#F4F6FA;font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F6FA;padding:40px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:#0D1B3E;padding:32px 40px;text-align:center;">
            <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
              <tr>
                <td style="background:linear-gradient(135deg,#6366F1,#4F46E5);width:44px;height:44px;border-radius:10px;text-align:center;vertical-align:middle;">
                  <span style="font-size:1.2rem;font-weight:900;color:white;line-height:44px;">S</span>
                </td>
                <td style="padding-left:12px;vertical-align:middle;">
                  <div style="font-weight:800;font-size:1rem;color:white;letter-spacing:0.1em;">SAMS</div>
                  <div style="font-size:0.65rem;color:rgba(255,255,255,0.45);letter-spacing:0.04em;">Sports Academy</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px 40px 32px;">
            <div style="display:inline-block;background:${roleColor}15;border:1px solid ${roleColor}30;border-radius:99px;padding:4px 14px;font-size:0.72rem;font-weight:700;color:${roleColor};letter-spacing:0.1em;text-transform:uppercase;margin-bottom:20px;">
              ${role} Invitation
            </div>

            <h1 style="margin:0 0 8px;font-size:1.6rem;font-weight:800;color:#0F172A;letter-spacing:-0.02em;">
              Hi ${firstName},
            </h1>
            <p style="margin:0 0 24px;font-size:1rem;color:#475569;line-height:1.65;">
              You've been invited to join <strong style="color:#0F172A;">${academyName}</strong> on SAMS as a <strong style="color:${roleColor};">${role}</strong>.
            </p>

            <!-- CTA Button -->
            <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
              <tr>
                <td style="background:#6366F1;border-radius:10px;text-align:center;">
                  <a href="${registrationUrl}" style="display:inline-block;padding:14px 32px;font-size:0.95rem;font-weight:700;color:white;text-decoration:none;letter-spacing:0.01em;">
                    Accept Invitation →
                  </a>
                </td>
              </tr>
            </table>

            <p style="margin:0 0 16px;font-size:0.85rem;color:#94A3B8;">
              Or copy and paste this link into your browser:
            </p>
            <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:12px 16px;font-family:monospace;font-size:0.78rem;color:#475569;word-break:break-all;margin-bottom:28px;">
              ${registrationUrl}
            </div>

            <div style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:8px;padding:12px 16px;font-size:0.82rem;color:#92400E;">
              ⏰ This invitation expires on <strong>${expiryDate}</strong>
            </div>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 40px 32px;border-top:1px solid #F1F5F9;">
            <p style="margin:0;font-size:0.75rem;color:#94A3B8;line-height:1.6;">
              If you didn't expect this invitation, you can safely ignore this email.<br>
              Questions? Contact your academy administrator.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const PLACEHOLDER_HOSTS = ['smtp.example.com', 'your-smtp-host', 'mail.example.com'];
  const smtpConfigured = (
    env.SMTP_HOST &&
    !PLACEHOLDER_HOSTS.includes(env.SMTP_HOST) &&
    env.SMTP_USER &&
    !env.SMTP_USER.includes('@youracademy.com') &&
    env.SMTP_PASS &&
    env.SMTP_PASS !== 'your-smtp-password'
  );

  if (smtpConfigured) {
    const transporter = nodemailer.createTransport({
      host:   env.SMTP_HOST,
      port:   env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
      tls: { rejectUnauthorized: false },
    });

    await transporter.sendMail({
      from:    env.EMAIL_FROM,
      to,
      subject: `You've been invited to ${academyName} — SAMS`,
      html,
      text: `Hi ${firstName},\n\nYou've been invited to join ${academyName} as a ${role}.\n\nAccept your invitation here: ${registrationUrl}\n\nThis link expires on ${expiryDate}.\n\n— SAMS Platform`,
    });

    console.info(`[EMAIL] ✓ Invitation sent to ${to} via ${env.SMTP_HOST}`);
  } else {
    // SMTP not configured — log to console for dev/testing
    console.info('');
    console.info('─────────────────────────────────────────────');
    console.info('[EMAIL] SMTP not configured — printing to console');
    console.info(`  To:      ${to}`);
    console.info(`  Name:    ${firstName} (${role})`);
    console.info(`  Academy: ${academyName}`);
    console.info(`  Link:    ${registrationUrl}`);
    console.info(`  Expires: ${expiryDate}`);
    console.info('  ↑ Configure SMTP_HOST/USER/PASS in backend/.env to send real emails');
    console.info('─────────────────────────────────────────────');
    console.info('');
  }
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
