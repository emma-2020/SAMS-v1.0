'use strict';

const jwt = require('jsonwebtoken');
const { UnauthorizedError } = require('../utils/errors');

const PLATFORM_JWT_SECRET =
  process.env.PLATFORM_JWT_SECRET || process.env.SUPABASE_JWT_SECRET;

// ─────────────────────────────────────────────────────────────────
// PLATFORM AUTHENTICATE
// Verifies a platform-admin JWT. Completely separate from the
// academy authenticate() middleware — never touches users or
// academies tables, never sets req.academyId.
// ─────────────────────────────────────────────────────────────────
async function platformAuthenticate(req, res, next) {
  try {
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Platform authorization header missing.');
    }

    const token = authHeader.slice(7).trim();
    if (!token) throw new UnauthorizedError('Platform bearer token is empty.');

    let payload;
    try {
      payload = jwt.verify(token, PLATFORM_JWT_SECRET);
    } catch {
      throw new UnauthorizedError('Platform token is invalid or expired.');
    }

    if (payload.type !== 'platform_admin') {
      throw new UnauthorizedError('Token is not a platform admin token.');
    }

    req.platformAdmin = {
      id:    payload.sub,
      name:  payload.name,
      email: payload.email,
    };

    next();
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────────
// SIGN PLATFORM TOKEN
// Called by platform.service.js after successful login.
// ─────────────────────────────────────────────────────────────────
function signPlatformToken(admin) {
  return jwt.sign(
    { type: 'platform_admin', name: admin.name, email: admin.email },
    PLATFORM_JWT_SECRET,
    { subject: admin.id, expiresIn: '12h' }
  );
}

// ─────────────────────────────────────────────────────────────────
// MFA CHALLENGE TOKEN
// Short-lived (5 min) token issued after password check when MFA is
// enabled. Cannot be used to call any protected endpoint — only
// POST /api/platform/mfa/verify accepts it.
// ─────────────────────────────────────────────────────────────────
function signMfaToken(adminId) {
  return jwt.sign(
    { type: 'platform_mfa_challenge' },
    PLATFORM_JWT_SECRET,
    { subject: adminId, expiresIn: '5m' }
  );
}

function verifyMfaToken(token) {
  const payload = jwt.verify(token, PLATFORM_JWT_SECRET);
  if (payload.type !== 'platform_mfa_challenge') {
    throw new Error('Not an MFA challenge token.');
  }
  return payload;
}

module.exports = { platformAuthenticate, signPlatformToken, signMfaToken, verifyMfaToken };
