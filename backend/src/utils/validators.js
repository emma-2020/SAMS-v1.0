// src/utils/validators.js
'use strict';

const { BadRequestError } = require('./errors');

const EMAIL_RE    = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN = 8;

/**
 * Validates signup payload.
 * Throws BadRequestError with a descriptive message on failure.
 */
function validateSignupPayload({ email, password, role, first_name, last_name }) {
  const errors = [];

  if (!email || typeof email !== 'string' || !EMAIL_RE.test(email.trim())) {
    errors.push('A valid email address is required.');
  }

  if (!password || typeof password !== 'string' || password.length < PASSWORD_MIN) {
    errors.push(`Password must be at least ${PASSWORD_MIN} characters.`);
  }

  const VALID_ROLES = ['Admin', 'Coach', 'Player', 'Parent'];
  if (!role || !VALID_ROLES.includes(role)) {
    errors.push(`Role must be one of: ${VALID_ROLES.join(', ')}.`);
  }

  if (!first_name || typeof first_name !== 'string' || first_name.trim().length < 1) {
    errors.push('first_name is required.');
  }

  if (!last_name || typeof last_name !== 'string' || last_name.trim().length < 1) {
    errors.push('last_name is required.');
  }

  if (errors.length > 0) {
    throw new BadRequestError(errors.join(' '));
  }
}

/**
 * Validates login payload.
 */
function validateLoginPayload({ email, password }) {
  if (!email || typeof email !== 'string' || !EMAIL_RE.test(email.trim())) {
    throw new BadRequestError('A valid email address is required.');
  }
  if (!password || typeof password !== 'string') {
    throw new BadRequestError('Password is required.');
  }
}

/**
 * Sanitises a string: trims whitespace, lowercases if specified.
 */
function sanitizeString(value, { lowercase = false } = {}) {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return lowercase ? trimmed.toLowerCase() : trimmed;
}

module.exports = { validateSignupPayload, validateLoginPayload, sanitizeString };
