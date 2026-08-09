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

const DATE_OF_BIRTH_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Optional date_of_birth captured at signup (invite-acceptance). Never
 * required. Returns a normalized 'YYYY-MM-DD' string, or null when omitted.
 * Throws BadRequestError if a value was supplied but isn't a real, past date.
 */
function validateDateOfBirth(dateOfBirth) {
  if (dateOfBirth === undefined || dateOfBirth === null || dateOfBirth === '') {
    return null;
  }
  if (typeof dateOfBirth !== 'string' || !DATE_OF_BIRTH_RE.test(dateOfBirth)) {
    throw new BadRequestError('Date of birth must be a valid date (YYYY-MM-DD).');
  }
  const parsed = new Date(`${dateOfBirth}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new BadRequestError('Date of birth must be a valid date (YYYY-MM-DD).');
  }
  if (parsed.getTime() > Date.now()) {
    throw new BadRequestError('Date of birth cannot be in the future.');
  }
  return dateOfBirth;
}

/**
 * The one required field of the signup-consent feature: the caller must
 * explicitly pass boolean `true` — omitted, false, or any other value is
 * rejected. There is no partial/optional acceptance.
 */
function validateTermsAccepted(termsAccepted) {
  if (termsAccepted !== true) {
    throw new BadRequestError('You must accept the Terms of Service and Privacy Policy to create an account.');
  }
}

module.exports = {
  validateLoginPayload,
  validatePasswordChange,
  sanitizeString,
  validateDateOfBirth,
  validateTermsAccepted,
};
