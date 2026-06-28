// src/services/email.service.js
'use strict';

/**
 * EmailService
 * ─────────────
 * Centralised outbound email dispatcher for the SAMS platform.
 *
 * Transport: Resend (https://resend.com)
 *   - A single Resend client instance is created at module load and reused.
 *   - If RESEND_API_KEY is absent or still a placeholder, every outbound email
 *     is printed to the terminal instead — zero crashes, zero silent failures.
 *
 * Exposed functions:
 *   sendInvitationEmail           — academy member invitation (Coach/Player/Parent)
 *   sendAcademyApprovalEmail      — new academy owner onboarding after approval
 *   sendAcademyRejectionEmail     — applicant notification on rejection
 *   sendEnrollmentConfirmationEmail — receipt acknowledgment on form submission
 */

const { Resend } = require('resend');
const env        = require('../config/env');

// ─── API key detection ────────────────────────────────────────────────────────

// Real Resend keys always start with "re_". Anything else is a placeholder.
const PLACEHOLDER_KEYS = [
  're_placeholder',
  're_xxxxxxxxxxxxxxxxxxxx',
  'your-resend-api-key',
];

function isResendConfigured() {
  return (
    Boolean(env.RESEND_API_KEY) &&
    env.RESEND_API_KEY.startsWith('re_') &&
    !PLACEHOLDER_KEYS.includes(env.RESEND_API_KEY)
  );
}

// ─── Resend client singleton ──────────────────────────────────────────────────

let _resend      = null;
let _initialized = false;

function getResend() {
  if (_initialized) return _resend;   // cached — null when key is missing/placeholder
  _initialized = true;

  if (!isResendConfigured()) {
    console.warn('');
    console.warn('[EmailService] ⚠  Running in development sandbox fallback mode (Printing messages directly to terminal).');
    console.warn('[EmailService]    RESEND_API_KEY is missing or set to a placeholder value.');
    console.warn('[EmailService]    To enable live email delivery:');
    console.warn('[EmailService]      1. Sign up at https://resend.com (free tier available)');
    console.warn('[EmailService]      2. Create an API key in the Resend dashboard');
    console.warn('[EmailService]      3. Set RESEND_API_KEY=re_xxxx in backend/.env');
    console.warn('[EmailService]      4. Set EMAIL_FROM to a verified sender address');
    console.warn('');
    return null;
  }

  try {
    _resend = new Resend(env.RESEND_API_KEY);
    console.info('[EmailService] ✓ Resend client initialized successfully');
  } catch (err) {
    console.error('[EmailService] ✗ Failed to initialize Resend client:', err.message);
    _resend = null;
  }

  return _resend;
}

// Runs once at module import — surfaces key problems at server startup, not on first send.
getResend();

// ─── Base dispatcher ──────────────────────────────────────────────────────────

/**
 * dispatch
 * Sends an email via Resend or falls back to a terminal dump when unconfigured.
 * Callers wrap this in try/catch — this function throws on Resend API error.
 */
async function dispatch({ to, subject, html, text }) {
  const client = getResend();

  if (!client) {
    // Development sandbox fallback — print full message to server terminal
    console.info('');
    console.info('══════════════════════════════════════════════════════════════');
    console.info('[EMAIL — development sandbox fallback mode]');
    console.info(`  To:      ${to}`);
    console.info(`  Subject: ${subject}`);
    console.info('  ── Plain text preview ──────────────────────────────────────');
    (text || '(no plain text)').split('\n').forEach(l => console.info(`  ${l}`));
    console.info('══════════════════════════════════════════════════════════════');
    console.info('');
    return { sent: false, mode: 'sandbox' };
  }

  const { data, error } = await client.emails.send({
    from:    env.EMAIL_FROM,
    to,
    subject,
    html,
    text,
  });

  if (error) {
    throw new Error(`Resend delivery failed: ${error.message || JSON.stringify(error)}`);
  }

  console.info(`[EmailService] ✓ Delivered via Resend → ${to} | "${subject}" (id: ${data?.id})`);
  return { sent: true, mode: 'resend', id: data?.id };
}

// ─── Shared HTML shell ────────────────────────────────────────────────────────

function emailShell(contentRows) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>SAMS Platform</title>
</head>
<body style="margin:0;padding:0;background:#EAEDF2;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#EAEDF2;padding:48px 16px;">
    <tr><td align="center">

      <table width="580" cellpadding="0" cellspacing="0"
        style="max-width:580px;width:100%;background:#FFFFFF;border-radius:20px;
               overflow:hidden;box-shadow:0 8px 48px rgba(0,0,0,0.11);">

        <!-- ── Brand Header ───────────────────────────────────────── -->
        <tr>
          <td style="background:linear-gradient(135deg,#0B1730 0%,#172649 100%);padding:36px 44px;">
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:linear-gradient(135deg,#6366F1,#4338CA);
                            width:50px;height:50px;border-radius:13px;
                            text-align:center;vertical-align:middle;">
                  <span style="font-size:1.45rem;font-weight:900;color:#fff;line-height:50px;">S</span>
                </td>
                <td style="padding-left:14px;vertical-align:middle;">
                  <div style="font-weight:800;font-size:1.05rem;color:#FFFFFF;
                               letter-spacing:0.14em;text-transform:uppercase;">SAMS</div>
                  <div style="font-size:0.65rem;color:rgba(255,255,255,0.42);
                               letter-spacing:0.06em;margin-top:3px;">Sports Academy Management</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- ── Injected content rows ──────────────────────────────── -->
        ${contentRows}

        <!-- ── Footer ─────────────────────────────────────────────── -->
        <tr>
          <td style="padding:22px 44px 34px;border-top:1px solid #EEF2F6;">
            <p style="margin:0;font-size:0.72rem;color:#9CA3AF;line-height:1.75;text-align:center;">
              This is an automated message from the SAMS Platform.<br>
              If you didn't expect this email, you can safely ignore it.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Template primitives ──────────────────────────────────────────────────────

function badge(label, color) {
  return `<div style="display:inline-block;background:${color}18;border:1px solid ${color}38;
    border-radius:99px;padding:5px 16px;font-size:0.7rem;font-weight:700;color:${color};
    letter-spacing:0.12em;text-transform:uppercase;margin-bottom:22px;">${label}</div>`;
}

function h1(text) {
  return `<h1 style="margin:0 0 12px;font-size:1.7rem;font-weight:800;color:#0F172A;
    letter-spacing:-0.025em;line-height:1.25;">${text}</h1>`;
}

function para(html) {
  return `<p style="margin:0 0 22px;font-size:0.97rem;color:#475569;line-height:1.72;">${html}</p>`;
}

function ctaButton(label, url, color = '#6366F1') {
  return `<table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
  <tr>
    <td style="background:${color};border-radius:12px;">
      <a href="${url}"
         style="display:inline-block;padding:15px 38px;font-size:0.94rem;
                font-weight:700;color:#FFFFFF;text-decoration:none;letter-spacing:0.02em;">
        ${label}
      </a>
    </td>
  </tr>
</table>`;
}

function linkBox(url) {
  return `<p style="margin:0 0 10px;font-size:0.82rem;color:#94A3B8;">
    Or paste this link into your browser:
  </p>
  <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;
               padding:13px 18px;font-family:monospace;font-size:0.75rem;color:#475569;
               word-break:break-all;margin-bottom:28px;">${url}</div>`;
}

function infoBox(accentBg, accentBorder, headingColor, bodyColor, heading, items) {
  const lis = items
    .map(i => `<li style="margin-bottom:6px;">${i}</li>`)
    .join('');
  return `<div style="background:${accentBg};border:1px solid ${accentBorder};
    border-radius:12px;padding:18px 22px;margin-bottom:28px;">
    <div style="font-size:0.79rem;font-weight:700;color:${headingColor};
                text-transform:uppercase;letter-spacing:0.08em;margin-bottom:10px;">${heading}</div>
    <ul style="margin:0;padding-left:20px;font-size:0.87rem;color:${bodyColor};line-height:1.9;">${lis}</ul>
  </div>`;
}

function warningBox(text) {
  return `<div style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:10px;
    padding:14px 18px;font-size:0.82rem;color:#92400E;margin-bottom:28px;">
    ⏰ ${text}
  </div>`;
}

function reasonBox(reason) {
  return `<div style="background:#FFF7ED;border:1px solid #FED7AA;border-radius:10px;
    padding:16px 20px;margin-bottom:24px;font-size:0.88rem;color:#9A3412;line-height:1.65;">
    <strong>Reason provided:</strong> ${reason}
  </div>`;
}

// ─── Email: Tenant Invitation ─────────────────────────────────────────────────

/**
 * sendInvitationEmail
 * Invitation for a new Coach, Player, or Parent to join an academy.
 */
async function sendInvitationEmail({ to, firstName, role, academyName, registrationUrl, expiresAt }) {
  const roleColors = {
    Admin:  '#7C3AED',
    Coach:  '#2563EB',
    Player: '#059669',
    Parent: '#D97706',
  };
  const roleColor = roleColors[role] || '#6366F1';

  const expiryDate = new Date(expiresAt).toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const html = emailShell(`
    <tr>
      <td style="padding:40px 44px 8px;">
        ${badge(`${role} Invitation`, roleColor)}
        ${h1(`Hi ${firstName},`)}
        ${para(`You've been invited to join <strong style="color:#0F172A;">${academyName}</strong>
          on SAMS as a <strong style="color:${roleColor};">${role}</strong>.
          Click the button below to create your account — it only takes a minute.`)}
        ${ctaButton('Accept Invitation →', registrationUrl, roleColor)}
        ${linkBox(registrationUrl)}
        ${warningBox(`This invitation expires on <strong>${expiryDate}</strong>.
          After this date, ask your admin to resend it.`)}
      </td>
    </tr>
  `);

  const text =
    `Hi ${firstName},\n\n` +
    `You've been invited to join ${academyName} on SAMS as a ${role}.\n\n` +
    `Accept your invitation here:\n${registrationUrl}\n\n` +
    `This link expires on ${expiryDate}.\n\n` +
    `— SAMS Platform`;

  return dispatch({
    to,
    subject: `You've been invited to join ${academyName} — SAMS`,
    html,
    text,
  });
}

// ─── Email: Academy Approved ──────────────────────────────────────────────────

/**
 * sendAcademyApprovalEmail
 * Sent to the new academy owner immediately after a Super-Admin approves
 * their enrollment request. Instructs them to check for the Supabase
 * account-confirmation email and then log in.
 */
async function sendAcademyApprovalEmail({ to, contactName, academyName, loginUrl }) {
  const html = emailShell(`
    <tr>
      <td style="padding:40px 44px 8px;">
        ${badge('Academy Approved ✓', '#059669')}
        ${h1(`Welcome, ${contactName}!`)}
        ${para(`Great news — your enrollment request for
          <strong style="color:#0F172A;">${academyName}</strong> has been
          <strong style="color:#059669;">approved</strong> by the SAMS team.
          Your workspace is ready and waiting.`)}
        ${para(`You will receive a second email shortly with your <strong>login credentials</strong>
          (Academy ID, email, and temporary password). Use those details to sign in.`)}
        ${ctaButton('Go to SAMS Login →', loginUrl, '#059669')}
        ${infoBox(
          '#F0FDF4', '#86EFAC', '#166534', '#15803D',
          "What's next?",
          [
            'Check your inbox for the credentials email (may be in spam)',
            `Log in at <a href="${loginUrl}" style="color:#15803D;">${loginUrl}</a>`,
            'Change your password in Settings after first login',
            'Create your first team, then invite coaches and players',
          ]
        )}
      </td>
    </tr>
  `);

  const text =
    `Hi ${contactName},\n\n` +
    `Your enrollment request for "${academyName}" has been approved!\n\n` +
    `Check your inbox for a second email with your login credentials.\n` +
    `Then log in at: ${loginUrl}\n\n` +
    `Next steps:\n` +
    `  1. Use the credentials email to sign in\n` +
    `  2. Change your password in Settings\n` +
    `  3. Create teams and invite members\n\n` +
    `— SAMS Platform`;

  return dispatch({
    to,
    subject: `Your academy "${academyName}" has been approved — SAMS`,
    html,
    text,
  });
}

// ─── Email: Academy Login Credentials ────────────────────────────────────────

/**
 * sendAcademyCredentialsEmail
 * Sent immediately after academy approval with the new admin's login details:
 * academy name, academy ID, email, and a temporary password.
 */
async function sendAcademyCredentialsEmail({
  to, contactName, academyName, academyId, loginEmail, tempPassword, loginUrl,
}) {
  const html = emailShell(`
    <tr>
      <td style="padding:40px 44px 8px;">
        ${badge('Your Login Credentials', '#7C3AED')}
        ${h1(`Hi ${contactName},`)}
        ${para(`Your <strong style="color:#0F172A;">${academyName}</strong> workspace is live.
          Use the details below to sign in for the first time.`)}

        <!-- Credentials box -->
        <div style="background:#F8FAFC;border:1.5px solid #E2E8F0;border-radius:14px;
                    padding:24px 28px;margin-bottom:28px;">
          <table cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td style="padding:7px 0;font-size:0.78rem;font-weight:700;color:#94A3B8;
                          text-transform:uppercase;letter-spacing:0.08em;width:38%;">Academy</td>
              <td style="padding:7px 0;font-size:0.93rem;font-weight:600;color:#0F172A;">${academyName}</td>
            </tr>
            <tr><td colspan="2" style="height:1px;background:#E2E8F0;"></td></tr>
            <tr>
              <td style="padding:7px 0;font-size:0.78rem;font-weight:700;color:#94A3B8;
                          text-transform:uppercase;letter-spacing:0.08em;">Academy ID</td>
              <td style="padding:7px 0;font-family:monospace;font-size:0.82rem;color:#0F172A;
                          word-break:break-all;">${academyId}</td>
            </tr>
            <tr><td colspan="2" style="height:1px;background:#E2E8F0;"></td></tr>
            <tr>
              <td style="padding:7px 0;font-size:0.78rem;font-weight:700;color:#94A3B8;
                          text-transform:uppercase;letter-spacing:0.08em;">Email</td>
              <td style="padding:7px 0;font-size:0.93rem;color:#0F172A;">${loginEmail}</td>
            </tr>
            <tr><td colspan="2" style="height:1px;background:#E2E8F0;"></td></tr>
            <tr>
              <td style="padding:7px 0;font-size:0.78rem;font-weight:700;color:#94A3B8;
                          text-transform:uppercase;letter-spacing:0.08em;">Password</td>
              <td style="padding:7px 0;font-family:monospace;font-size:1rem;font-weight:700;
                          color:#6366F1;letter-spacing:0.05em;">${tempPassword}</td>
            </tr>
          </table>
        </div>

        ${warningBox(`This is a <strong>temporary password</strong>. Please change it immediately after your first login via <strong>Settings → Change Password</strong>.`)}

        ${ctaButton('Log in to SAMS →', loginUrl, '#6366F1')}
      </td>
    </tr>
  `);

  const text =
    `Hi ${contactName},\n\n` +
    `Your ${academyName} workspace is live. Use these details to log in:\n\n` +
    `  Academy:     ${academyName}\n` +
    `  Academy ID:  ${academyId}\n` +
    `  Email:       ${loginEmail}\n` +
    `  Password:    ${tempPassword}\n\n` +
    `Log in at: ${loginUrl}\n\n` +
    `IMPORTANT: This is a temporary password. Please change it immediately\n` +
    `after your first login via Settings → Change Password.\n\n` +
    `— SAMS Platform`;

  return dispatch({
    to,
    subject: `Your SAMS login credentials — ${academyName}`,
    html,
    text,
  });
}

// ─── Email: Academy Rejected ──────────────────────────────────────────────────

/**
 * sendAcademyRejectionEmail
 * Sent to the enrollment applicant when a Super-Admin rejects the request.
 */
async function sendAcademyRejectionEmail({ to, contactName, academyName, reason, enrollUrl }) {
  const html = emailShell(`
    <tr>
      <td style="padding:40px 44px 8px;">
        ${badge('Enrollment Update', '#64748B')}
        ${h1(`Hi ${contactName},`)}
        ${para(`Thank you for your interest in SAMS. After reviewing your enrollment request for
          <strong style="color:#0F172A;">${academyName}</strong>,
          we're unable to approve it at this time.`)}
        ${reason ? reasonBox(reason) : ''}
        ${para(`You're welcome to address the feedback and submit a new application at any time.`)}
        ${ctaButton('Submit a New Application', enrollUrl, '#6366F1')}
        ${para(`<span style="font-size:0.83rem;color:#94A3B8;">
          If you believe this was a mistake or need further assistance,
          please reply to this email.
        </span>`)}
      </td>
    </tr>
  `);

  const text =
    `Hi ${contactName},\n\n` +
    `Thank you for your interest in SAMS.\n\n` +
    `After reviewing your enrollment request for "${academyName}", ` +
    `we're unable to approve it at this time.\n` +
    (reason ? `\nReason: ${reason}\n` : '') +
    `\nYou're welcome to reapply at any time: ${enrollUrl}\n\n` +
    `— SAMS Platform`;

  return dispatch({
    to,
    subject: `Your SAMS enrollment request for "${academyName}"`,
    html,
    text,
  });
}

// ─── Email: Enrollment Confirmation ──────────────────────────────────────────

/**
 * sendEnrollmentConfirmationEmail
 * Acknowledgment sent to the prospective academy owner the moment their
 * enrollment form is submitted — before any review takes place.
 */
async function sendEnrollmentConfirmationEmail({ to, contactName, academyName }) {
  const html = emailShell(`
    <tr>
      <td style="padding:40px 44px 8px;">
        ${badge('Application Received', '#2563EB')}
        ${h1(`Thanks, ${contactName}!`)}
        ${para(`We've received your enrollment request for
          <strong style="color:#0F172A;">${academyName}</strong>
          and it's now in our review queue.`)}
        ${infoBox(
          '#EFF6FF', '#BFDBFE', '#1E40AF', '#1D4ED8',
          'What happens next?',
          [
            'Our team reviews your application (typically within 48 hours)',
            'You\'ll receive an approval or update email at this address',
            'If approved, you\'ll get instant access to set up your academy',
          ]
        )}
        ${para(`<span style="font-size:0.83rem;color:#94A3B8;">
          Keep an eye on your inbox. If you haven't heard back within 48 hours,
          check your spam folder.
        </span>`)}
      </td>
    </tr>
  `);

  const text =
    `Hi ${contactName},\n\n` +
    `We've received your enrollment request for "${academyName}".\n\n` +
    `What happens next:\n` +
    `  1. Our team reviews your application (within 48 hours)\n` +
    `  2. You receive an approval or update email\n` +
    `  3. If approved, you get instant access to set up your academy\n\n` +
    `— SAMS Platform`;

  return dispatch({
    to,
    subject: `We've received your SAMS enrollment request — ${academyName}`,
    html,
    text,
  });
}

// ─── Email: Password Reset ────────────────────────────────────────────────────

/**
 * sendPasswordResetEmail
 * Sent when a user requests a password reset via "Forgot password?".
 * Contains a single-use link that expires in 1 hour (Supabase default).
 */
async function sendPasswordResetEmail({ to, firstName, resetLink }) {
  const html = emailShell(`
    <tr>
      <td style="padding:40px 44px 8px;">
        ${badge('Password Reset', '#6366F1')}
        ${h1(`Hi ${firstName},`)}
        ${para(`We received a request to reset the password for your SAMS account.
          Click the button below to choose a new password.`)}
        ${ctaButton('Reset My Password →', resetLink, '#6366F1')}
        ${linkBox(resetLink)}
        ${warningBox(`This link expires in <strong>1 hour</strong>.
          If you did not request a password reset, you can safely ignore this email
          — your password will not change.`)}
      </td>
    </tr>
  `);

  const text =
    `Hi ${firstName},\n\n` +
    `We received a request to reset your SAMS password.\n\n` +
    `Reset your password here:\n${resetLink}\n\n` +
    `This link expires in 1 hour.\n` +
    `If you didn't request this, ignore this email — your password won't change.\n\n` +
    `— SAMS Platform`;

  return dispatch({
    to,
    subject: 'Reset your SAMS password',
    html,
    text,
  });
}

// ─── Email: Fee Due Notification ─────────────────────────────────────────────

/**
 * sendFeeNotificationEmail
 * Sent to a player (and CC'd to their linked parent) when an admin creates a
 * new fee record. Tells them what is owed, the amount, and how to pay.
 */
async function sendFeeNotificationEmail({
  to,
  firstName,
  academyName,
  description,
  amountOwed,
  paymentDate,
  notes,
  paymentUrl,
  dashboardUrl,
}) {
  const fmtGhs = (pesewas) => `GHS ${(pesewas / 100).toFixed(2)}`;

  const dueLine = paymentDate
    ? new Date(paymentDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  const html = emailShell(`
    <tr>
      <td style="padding:40px 44px 8px;">
        ${badge('Fee Notice', '#DC2626')}
        ${h1(`Hi ${firstName},`)}
        ${para(`A new fee has been assigned to your account at
          <strong style="color:#0F172A;">${academyName}</strong>.
          Please review the details below and arrange payment at your earliest convenience.`)}

        <!-- Fee detail box -->
        <div style="background:#FFF7F7;border:1.5px solid #FECACA;border-radius:14px;
                    padding:24px 28px;margin-bottom:28px;">
          <table cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td style="padding:8px 0;font-size:0.78rem;font-weight:700;color:#94A3B8;
                          text-transform:uppercase;letter-spacing:0.08em;width:38%;">Description</td>
              <td style="padding:8px 0;font-size:0.93rem;font-weight:600;color:#0F172A;">${description}</td>
            </tr>
            <tr><td colspan="2" style="height:1px;background:#FECACA;"></td></tr>
            <tr>
              <td style="padding:8px 0;font-size:0.78rem;font-weight:700;color:#94A3B8;
                          text-transform:uppercase;letter-spacing:0.08em;">Amount Due</td>
              <td style="padding:8px 0;font-size:1.15rem;font-weight:800;color:#DC2626;">${fmtGhs(amountOwed)}</td>
            </tr>
            ${dueLine ? `
            <tr><td colspan="2" style="height:1px;background:#FECACA;"></td></tr>
            <tr>
              <td style="padding:8px 0;font-size:0.78rem;font-weight:700;color:#94A3B8;
                          text-transform:uppercase;letter-spacing:0.08em;">Due Date</td>
              <td style="padding:8px 0;font-size:0.93rem;color:#0F172A;">${dueLine}</td>
            </tr>` : ''}
            ${notes ? `
            <tr><td colspan="2" style="height:1px;background:#FECACA;"></td></tr>
            <tr>
              <td style="padding:8px 0;font-size:0.78rem;font-weight:700;color:#94A3B8;
                          text-transform:uppercase;letter-spacing:0.08em;">Notes</td>
              <td style="padding:8px 0;font-size:0.88rem;color:#475569;">${notes}</td>
            </tr>` : ''}
          </table>
        </div>

        ${paymentUrl ? `
        ${ctaButton('Pay Online Now →', paymentUrl, '#059669')}
        ` : ''}

        ${infoBox(
          '#F0FDF4', '#86EFAC', '#166534', '#15803D',
          'How to pay',
          [
            ...(paymentUrl ? [`<strong>Online</strong> — Click the "Pay Online Now" button above to pay securely with card or Mobile Money`] : []),
            '<strong>Cash</strong> — Pay directly at the academy office',
            '<strong>Mobile Money (MoMo)</strong> — MTN, Vodafone Cash, AirtelTigo Money — contact the academy for the number',
            '<strong>Bank Transfer</strong> — Contact the academy admin for bank details',
          ]
        )}

        ${para(`Once payment is made, your balance will be updated automatically. Log in to SAMS to track your fee status at any time.`)}

        ${ctaButton('View My Fee Balance →', dashboardUrl, '#6366F1')}
      </td>
    </tr>
  `);

  const text =
    `Hi ${firstName},\n\n` +
    `A new fee has been assigned to your account at ${academyName}.\n\n` +
    `FEE DETAILS\n` +
    `  Description: ${description}\n` +
    `  Amount Due:  ${fmtGhs(amountOwed)}\n` +
    (dueLine ? `  Due Date:    ${dueLine}\n` : '') +
    (notes   ? `  Notes:       ${notes}\n` : '') +
    `\nHOW TO PAY\n` +
    `  Cash — Pay at the academy office\n` +
    `  MoMo — Contact the academy for the MoMo number\n` +
    `  Bank Transfer — Contact the academy admin for bank details\n\n` +
    `Log in to view your balance: ${dashboardUrl}\n\n` +
    `— SAMS Platform`;

  return dispatch({
    to,
    subject: `Fee Notice: ${description} — ${fmtGhs(amountOwed)} due | ${academyName}`,
    html,
    text,
  });
}

// ─── Email: Fee Payment Receipt ───────────────────────────────────────────────

/**
 * sendFeeReceiptEmail
 * Sent to a player (and linked parents) after Paystack confirms a successful charge.
 */
async function sendFeeReceiptEmail({
  to,
  firstName,
  academyName,
  description,
  amountPaid,
  totalOwed,
  totalPaid,
  fullyPaid,
  channel,
  dashboardUrl,
}) {
  const fmtGhs = (p) => `GHS ${(p / 100).toFixed(2)}`;
  const remaining = totalOwed - totalPaid;
  const channelLabel = channel === 'mobile_money' ? 'Mobile Money' : channel === 'card' ? 'Card' : 'Online';

  const statusColor  = fullyPaid ? '#059669' : '#D97706';
  const statusLabel  = fullyPaid ? 'Fully Paid ✓' : 'Partial Payment';

  const html = emailShell(`
    <tr>
      <td style="padding:40px 44px 8px;">
        ${badge(statusLabel, statusColor)}
        ${h1(`Hi ${firstName},`)}
        ${para(`We've received your payment of <strong style="color:#0F172A;">${fmtGhs(amountPaid)}</strong>
          for <strong style="color:#0F172A;">${description}</strong> at ${academyName}.`)}

        <!-- Receipt box -->
        <div style="background:#F0FDF4;border:1.5px solid #86EFAC;border-radius:14px;
                    padding:24px 28px;margin-bottom:28px;">
          <table cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td style="padding:8px 0;font-size:0.78rem;font-weight:700;color:#94A3B8;
                          text-transform:uppercase;letter-spacing:0.08em;width:38%;">Amount Paid</td>
              <td style="padding:8px 0;font-size:1.05rem;font-weight:800;color:#059669;">${fmtGhs(amountPaid)}</td>
            </tr>
            <tr><td colspan="2" style="height:1px;background:#86EFAC;"></td></tr>
            <tr>
              <td style="padding:8px 0;font-size:0.78rem;font-weight:700;color:#94A3B8;
                          text-transform:uppercase;letter-spacing:0.08em;">Payment Method</td>
              <td style="padding:8px 0;font-size:0.93rem;color:#0F172A;">${channelLabel}</td>
            </tr>
            <tr><td colspan="2" style="height:1px;background:#86EFAC;"></td></tr>
            <tr>
              <td style="padding:8px 0;font-size:0.78rem;font-weight:700;color:#94A3B8;
                          text-transform:uppercase;letter-spacing:0.08em;">Total Owed</td>
              <td style="padding:8px 0;font-size:0.93rem;color:#0F172A;">${fmtGhs(totalOwed)}</td>
            </tr>
            <tr><td colspan="2" style="height:1px;background:#86EFAC;"></td></tr>
            <tr>
              <td style="padding:8px 0;font-size:0.78rem;font-weight:700;color:#94A3B8;
                          text-transform:uppercase;letter-spacing:0.08em;">Balance</td>
              <td style="padding:8px 0;font-size:0.93rem;font-weight:700;color:${statusColor};">
                ${fullyPaid ? 'Paid in full' : `${fmtGhs(remaining)} remaining`}
              </td>
            </tr>
          </table>
        </div>

        ${ctaButton('View My Fee Balance →', dashboardUrl, '#6366F1')}
      </td>
    </tr>
  `);

  const text =
    `Hi ${firstName},\n\n` +
    `Payment received for "${description}" at ${academyName}.\n\n` +
    `RECEIPT\n` +
    `  Amount Paid:    ${fmtGhs(amountPaid)}\n` +
    `  Payment Method: ${channelLabel}\n` +
    `  Total Owed:     ${fmtGhs(totalOwed)}\n` +
    `  Balance:        ${fullyPaid ? 'Paid in full' : `${fmtGhs(remaining)} remaining`}\n\n` +
    `View your fee balance: ${dashboardUrl}\n\n` +
    `— SAMS Platform`;

  return dispatch({
    to,
    subject: `Payment received: ${fmtGhs(amountPaid)} for ${description} — ${academyName}`,
    html,
    text,
  });
}

// ─── Email: Fee Reminder ──────────────────────────────────────────────────────

async function sendFeeReminderEmail({
  to,
  firstName,
  playerName,
  description,
  amountDue,
  paymentDate,
  academyName,
  paymentUrl,
  dashboardUrl,
}) {
  const fmtGhs = (p) => `GHS ${(p / 100).toFixed(2)}`;
  const dueDateFmt = paymentDate
    ? new Date(paymentDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'soon';
  const forWhom = playerName ? ` for <strong style="color:#0F172A;">${playerName}</strong>` : '';

  const html = emailShell(`
    <tr>
      <td style="padding:40px 44px 8px;">
        ${badge('Fee Reminder', '#D97706')}
        ${h1(`Hi ${firstName},`)}
        ${para(`This is a friendly reminder that the following fee${forWhom} is due on
          <strong style="color:#D97706;">${dueDateFmt}</strong>.`)}

        <div style="background:#FFFBEB;border:1.5px solid #FDE68A;border-radius:14px;
                    padding:24px 28px;margin-bottom:28px;">
          <table cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td style="padding:8px 0;font-size:0.78rem;font-weight:700;color:#94A3B8;
                          text-transform:uppercase;letter-spacing:0.08em;width:38%;">Description</td>
              <td style="padding:8px 0;font-size:0.93rem;color:#0F172A;">${description}</td>
            </tr>
            <tr><td colspan="2" style="height:1px;background:#FDE68A;"></td></tr>
            <tr>
              <td style="padding:8px 0;font-size:0.78rem;font-weight:700;color:#94A3B8;
                          text-transform:uppercase;letter-spacing:0.08em;">Amount Due</td>
              <td style="padding:8px 0;font-size:1.1rem;font-weight:800;color:#D97706;">${fmtGhs(amountDue)}</td>
            </tr>
            <tr><td colspan="2" style="height:1px;background:#FDE68A;"></td></tr>
            <tr>
              <td style="padding:8px 0;font-size:0.78rem;font-weight:700;color:#94A3B8;
                          text-transform:uppercase;letter-spacing:0.08em;">Due Date</td>
              <td style="padding:8px 0;font-size:0.93rem;font-weight:700;color:#92400E;">${dueDateFmt}</td>
            </tr>
          </table>
        </div>

        ${paymentUrl ? ctaButton('Pay Now →', paymentUrl, '#D97706') : ctaButton('View Fee →', dashboardUrl, '#6366F1')}
        ${para(`<span style="font-size:0.83rem;color:#94A3B8;">
          You can manage all fees from the ${academyName} dashboard.
        </span>`)}
      </td>
    </tr>
  `);

  const text =
    `Hi ${firstName},\n\n` +
    `Reminder: "${description}"${playerName ? ` for ${playerName}` : ''} is due on ${dueDateFmt}.\n\n` +
    `Amount due: ${fmtGhs(amountDue)}\n\n` +
    (paymentUrl ? `Pay now: ${paymentUrl}\n\n` : `View fees: ${dashboardUrl}\n\n`) +
    `— ${academyName} via SAMS Platform`;

  return dispatch({
    to,
    subject: `Fee reminder: ${description} due ${dueDateFmt} — ${academyName}`,
    html,
    text,
  });
}

// ─── Email: Announcement ──────────────────────────────────────────────────────

const AUDIENCE_LABEL = {
  everyone: 'All Members',
  players:  'Players',
  coaches:  'Coaches',
  parents:  'Parents',
};

/**
 * sendAnnouncementEmail
 * Sent to all members in the target audience when an announcement is created.
 */
async function sendAnnouncementEmail({ to, firstName, academyName, title, body, audience = 'everyone', dashboardUrl }) {
  const audienceLabel = AUDIENCE_LABEL[audience] || 'All Members';

  const html = emailShell(`
    <tr>
      <td style="padding:40px 44px 8px;">
        ${badge(`📢 Announcement · ${audienceLabel}`, '#6366F1')}
        ${h1(title)}
        ${para(`Hi ${firstName}, <strong style="color:#0F172A;">${academyName}</strong> has a new announcement for you.`)}

        <div style="background:#F8FAFC;border:1.5px solid #E2E8F0;border-left:4px solid #6366F1;
                    border-radius:12px;padding:20px 24px;margin-bottom:28px;
                    font-size:0.93rem;color:#334155;line-height:1.75;white-space:pre-wrap;">${body.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>

        ${ctaButton('View Dashboard →', dashboardUrl, '#6366F1')}
      </td>
    </tr>
  `);

  const text =
    `Hi ${firstName},\n\n` +
    `New announcement from ${academyName}:\n\n` +
    `${title}\n` +
    `${'─'.repeat(title.length)}\n` +
    `${body}\n\n` +
    `View your dashboard: ${dashboardUrl}\n\n` +
    `— SAMS Platform`;

  return dispatch({
    to,
    subject: `[${academyName}] ${title}`,
    html,
    text,
  });
}

// ─── Email: Registration Submitted (to player) ────────────────────────────────

async function sendRegistrationSubmittedEmail({ to, firstName, academyName, dashboardUrl }) {
  const html = emailShell(`
    <tr>
      <td style="padding:40px 44px 8px;">
        ${badge('Registration Submitted', '#2563EB')}
        ${h1(`Thanks, ${firstName}!`)}
        ${para(`Your registration with <strong style="color:#0F172A;">${academyName}</strong>
          has been submitted successfully and is now under review.`)}
        ${infoBox(
          '#EFF6FF', '#BFDBFE', '#1E40AF', '#1D4ED8',
          'What happens next?',
          [
            'The academy admin will review your registration details',
            'You will receive an email once a decision has been made',
            'If approved, you will have full access to the platform',
            'If any information needs to be corrected, you will be notified',
          ]
        )}
        ${para(`<span style="font-size:0.83rem;color:#94A3B8;">
          Keep an eye on your inbox. If you don't hear back within a few days,
          please contact your academy admin directly.
        </span>`)}
        ${ctaButton('View Registration Status →', dashboardUrl, '#2563EB')}
      </td>
    </tr>
  `);

  const text =
    `Hi ${firstName},\n\n` +
    `Your registration with ${academyName} has been submitted and is under review.\n\n` +
    `What happens next:\n` +
    `  1. The admin reviews your registration details\n` +
    `  2. You receive an approval or update email\n` +
    `  3. If approved, you get full platform access\n\n` +
    `View your status: ${dashboardUrl}\n\n` +
    `— SAMS Platform`;

  return dispatch({
    to,
    subject: `Registration submitted — ${academyName} is reviewing your details`,
    html,
    text,
  });
}

// ─── Email: Registration Alert (to admin) ─────────────────────────────────────

async function sendRegistrationAlertEmail({ to, adminName, playerName, playerEmail, academyName, reviewUrl }) {
  const html = emailShell(`
    <tr>
      <td style="padding:40px 44px 8px;">
        ${badge('New Registration', '#7C3AED')}
        ${h1(`Hi ${adminName},`)}
        ${para(`A new player registration has been submitted and is waiting for your review.`)}

        <div style="background:#F8FAFC;border:1.5px solid #E2E8F0;border-radius:14px;
                    padding:24px 28px;margin-bottom:28px;">
          <table cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td style="padding:7px 0;font-size:0.78rem;font-weight:700;color:#94A3B8;
                          text-transform:uppercase;letter-spacing:0.08em;width:38%;">Player</td>
              <td style="padding:7px 0;font-size:0.93rem;font-weight:600;color:#0F172A;">${playerName}</td>
            </tr>
            <tr><td colspan="2" style="height:1px;background:#E2E8F0;"></td></tr>
            <tr>
              <td style="padding:7px 0;font-size:0.78rem;font-weight:700;color:#94A3B8;
                          text-transform:uppercase;letter-spacing:0.08em;">Email</td>
              <td style="padding:7px 0;font-size:0.93rem;color:#0F172A;">${playerEmail}</td>
            </tr>
            <tr><td colspan="2" style="height:1px;background:#E2E8F0;"></td></tr>
            <tr>
              <td style="padding:7px 0;font-size:0.78rem;font-weight:700;color:#94A3B8;
                          text-transform:uppercase;letter-spacing:0.08em;">Academy</td>
              <td style="padding:7px 0;font-size:0.93rem;color:#0F172A;">${academyName}</td>
            </tr>
          </table>
        </div>

        ${ctaButton('Review Registration →', reviewUrl, '#7C3AED')}
        ${para(`<span style="font-size:0.83rem;color:#94A3B8;">
          Log in to the SAMS admin dashboard to view the full registration details
          and approve or reject the submission.
        </span>`)}
      </td>
    </tr>
  `);

  const text =
    `Hi ${adminName},\n\n` +
    `A new player registration has been submitted for your review.\n\n` +
    `Player:  ${playerName}\n` +
    `Email:   ${playerEmail}\n` +
    `Academy: ${academyName}\n\n` +
    `Review now: ${reviewUrl}\n\n` +
    `— SAMS Platform`;

  return dispatch({
    to,
    subject: `New registration submitted: ${playerName} — ${academyName}`,
    html,
    text,
  });
}

// ─── Email: Registration Approved (to player) ─────────────────────────────────

async function sendRegistrationApprovedEmail({ to, firstName, academyName, dashboardUrl }) {
  const html = emailShell(`
    <tr>
      <td style="padding:40px 44px 8px;">
        ${badge('Registration Approved ✓', '#059669')}
        ${h1(`Congratulations, ${firstName}!`)}
        ${para(`Your registration with <strong style="color:#0F172A;">${academyName}</strong>
          has been <strong style="color:#059669;">approved</strong>.
          You now have full access to the SAMS platform.`)}
        ${infoBox(
          '#F0FDF4', '#86EFAC', '#166534', '#15803D',
          "You now have access to:",
          [
            'Your personalised player dashboard',
            'Training schedule and upcoming sessions',
            'Workout plans assigned by your coach',
            'Daily wellness check-in and health tracking',
            'Team chat and announcements',
          ]
        )}
        ${ctaButton('Go to My Dashboard →', dashboardUrl, '#059669')}
      </td>
    </tr>
  `);

  const text =
    `Hi ${firstName},\n\n` +
    `Your registration with ${academyName} has been approved!\n\n` +
    `You now have full access to the SAMS platform.\n` +
    `Log in at: ${dashboardUrl}\n\n` +
    `— SAMS Platform`;

  return dispatch({
    to,
    subject: `Registration approved — Welcome to ${academyName}!`,
    html,
    text,
  });
}

// ─── Email: Registration Rejected (to player) ─────────────────────────────────

async function sendRegistrationRejectedEmail({ to, firstName, academyName, reason, dashboardUrl }) {
  const html = emailShell(`
    <tr>
      <td style="padding:40px 44px 8px;">
        ${badge('Registration Update', '#64748B')}
        ${h1(`Hi ${firstName},`)}
        ${para(`Thank you for submitting your registration with
          <strong style="color:#0F172A;">${academyName}</strong>.
          After reviewing your details, we were unable to approve it at this time.`)}
        ${reason ? reasonBox(reason) : ''}
        ${para(`Please review the feedback above, update your registration details,
          and resubmit. If you have any questions, contact your academy admin directly.`)}
        ${ctaButton('Update My Registration →', dashboardUrl, '#6366F1')}
      </td>
    </tr>
  `);

  const text =
    `Hi ${firstName},\n\n` +
    `Your registration with ${academyName} could not be approved at this time.\n\n` +
    (reason ? `Reason: ${reason}\n\n` : '') +
    `Please update your registration and resubmit: ${dashboardUrl}\n\n` +
    `— SAMS Platform`;

  return dispatch({
    to,
    subject: `Registration update — ${academyName}`,
    html,
    text,
  });
}

// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  sendInvitationEmail,
  sendAcademyApprovalEmail,
  sendAcademyCredentialsEmail,
  sendAcademyRejectionEmail,
  sendEnrollmentConfirmationEmail,
  sendPasswordResetEmail,
  sendFeeNotificationEmail,
  sendFeeReceiptEmail,
  sendFeeReminderEmail,
  sendAnnouncementEmail,
  sendRegistrationSubmittedEmail,
  sendRegistrationAlertEmail,
  sendRegistrationApprovedEmail,
  sendRegistrationRejectedEmail,
};
