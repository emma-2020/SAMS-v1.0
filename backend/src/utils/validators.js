'use strict';

const { BadRequestError } = require('./errors');

const EMAIL_RE       = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN   = 8;

// Password must have at least: 1 uppercase, 1 lowercase, 1 digit, 1 special char
const HAS_UPPER      = /[A-Z]/;
const HAS_LOWER      = /[a-z]/;
const HAS_DIGIT      = /[0-9]/;
const HAS_SPECIAL    = /[^A-Za-z0-9]/;

/**
 * Enforces password strength rules shared across signup and change-password.
 * Returns an array of error strings (empty = valid).
 */
function checkPasswordStrength(password) {
  const errors = [];
  if (!password || typeof password !== 'string') {
    return ['Password is required.'];
  }
  if (password.length < PASSWORD_MIN)   errors.push(`Password must be at least ${PASSWORD_MIN} characters.`);
  if (!HAS_UPPER.test(password))        errors.push('Password must contain at least one uppercase letter.');
  if (!HAS_LOWER.test(password))        errors.push('Password must contain at least one lowercase letter.');
  if (!HAS_DIGIT.test(password))        errors.push('Password must contain at least one number.');
  if (!HAS_SPECIAL.test(password))      errors.push('Password must contain at least one special character.');
  return errors;
}

function validateSignupPayload({ email, password, role, first_name, last_name }) {
  const errors = [];

  if (!email || typeof email !== 'string' || !EMAIL_RE.test(email.trim())) {
    errors.push('A valid email address is required.');
  }

  errors.push(...checkPasswordStrength(password));

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

function validateLoginPayload({ email, password }) {
  if (!email || typeof email !== 'string' || !EMAIL_RE.test(email.trim())) {
    throw new BadRequestError('A valid email address is required.');
  }
  if (!password || typeof password !== 'string') {
    throw new BadRequestError('Password is required.');
  }
}

function validatePasswordChange(password) {
  const errors = checkPasswordStrength(password);
  if (errors.length > 0) {
    throw new BadRequestError(errors.join(' '));
  }
}

function sanitizeString(value, { lowercase = false } = {}) {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return lowercase ? trimmed.toLowerCase() : trimmed;
}

module.exports = {
  validateSignupPayload,
  validateLoginPayload,
  validatePasswordChange,
  sanitizeString,
};
