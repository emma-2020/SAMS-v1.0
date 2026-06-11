'use strict';

const { supabaseAdmin } = require('../config/supabase');
const { BadRequestError, ConflictError, InternalError } = require('../utils/errors');

// Strips all HTML tags and normalises whitespace
function sanitize(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/<[^>]*>/g, '').trim().slice(0, 1000);
}

// POST /api/public/enroll
async function submitEnrollment(req, res, next) {
  try {
    const {
      academy_name,
      contact_name,
      contact_email,
      sport,
      estimated_players,
      message,
    } = req.body;

    // ── Required field validation ──────────────────────────────
    const missing = [];
    if (!academy_name?.trim())   missing.push('academy_name');
    if (!contact_name?.trim())   missing.push('contact_name');
    if (!contact_email?.trim())  missing.push('contact_email');
    if (missing.length) {
      throw new BadRequestError(`Missing required fields: ${missing.join(', ')}.`);
    }

    // ── Basic email format check ───────────────────────────────
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(contact_email.trim())) {
      throw new BadRequestError('Invalid email address.');
    }

    // ── Duplicate pending check ────────────────────────────────
    const { data: existing } = await supabaseAdmin
      .from('platform_enrollment_requests')
      .select('id, status')
      .eq('contact_email', contact_email.toLowerCase().trim())
      .eq('status', 'pending')
      .maybeSingle();

    if (existing) {
      throw new ConflictError(
        'A pending enrollment request already exists for this email. ' +
        'Our team will be in touch shortly.'
      );
    }

    // ── Sanitize and insert ────────────────────────────────────
    const payload = {
      academy_name:      sanitize(academy_name),
      contact_name:      sanitize(contact_name),
      contact_email:     contact_email.toLowerCase().trim(),
      sport:             sanitize(sport || ''),
      estimated_players: estimated_players ? parseInt(estimated_players, 10) || null : null,
      message:           sanitize(message || ''),
      status:            'pending',
    };

    const { error } = await supabaseAdmin
      .from('platform_enrollment_requests')
      .insert(payload);

    if (error) throw new InternalError('Failed to submit enrollment request.');

    return res.status(201).json({
      success: true,
      message: 'Enrollment request received. Our team will review it and be in touch within 48 hours.',
    });
  } catch (err) { next(err); }
}

module.exports = { submitEnrollment };
