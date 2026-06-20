// src/middleware/auth.middleware.js
'use strict';

const { supabaseAdmin } = require('../config/supabase');
const { UnauthorizedError, ForbiddenError } = require('../utils/errors');

const VALID_ROLES = ['Admin', 'Coach', 'Player', 'Parent'];

// ─────────────────────────────────────────────────────────────────
// AUTHENTICATE
// ─────────────────────────────────────────────────────────────────

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Authorization header missing or malformed.');
    }

    const token = authHeader.slice(7).trim();
    if (!token) throw new UnauthorizedError('Bearer token is empty.');

    const { data: { user: authUser }, error: authError } =
      await supabaseAdmin.auth.getUser(token);

    if (authError || !authUser) {
      throw new UnauthorizedError('Token is invalid or has expired. Please log in again.');
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('id, academy_id, role, first_name, last_name, is_active')
      .eq('id', authUser.id)
      .single();

    if (profileError || !profile) {
      throw new UnauthorizedError('User profile not found.');
    }

    if (profile.is_active === false) {
      throw new UnauthorizedError('This account has been deactivated.');
    }

    if (!VALID_ROLES.includes(profile.role)) {
      throw new UnauthorizedError(`Unrecognised role: "${profile.role}".`);
    }

    req.user = {
      id:         profile.id,
      academy_id: profile.academy_id,
      role:       profile.role,
      first_name: profile.first_name || '',
      last_name:  profile.last_name  || '',
    };
    req.accessToken = token;

    // Fire-and-forget: update presence timestamp (don't block the request)
    supabaseAdmin.from('users')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('id', profile.id)
      .then(() => {}).catch(() => {});

    next();
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────────
// EXTRACT TENANT
// Defensive version: does NOT select is_active to avoid failing
// if the column hasn't been added to the academies table yet.
// Active/suspended check is a V1.1 feature.
// ─────────────────────────────────────────────────────────────────

async function extractTenant(req, res, next) {
  try {
    if (!req.user || !req.user.academy_id) {
      throw new UnauthorizedError('Tenant context missing.');
    }
    // academy_id FK was already validated against the users table in authenticate().
    // Querying the academies table here via the REST API was causing 406 errors
    // due to missing RLS policies on that table. The FK constraint guarantees
    // the academy exists if the user record exists.
    req.academyId   = req.user.academy_id;
    req.academyName = null; // fetched lazily by services that need it
    next();
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────────
// REQUIRE ROLE
// ─────────────────────────────────────────────────────────────────

function requireRole(...allowedRoles) {
  const invalid = allowedRoles.filter((r) => !VALID_ROLES.includes(r));
  if (invalid.length > 0) {
    throw new Error(`[requireRole] Invalid role(s): ${invalid.join(', ')}`);
  }

  return async function rbacGuard(req, res, next) {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Not authenticated.');
      }
      if (!allowedRoles.includes(req.user.role)) {
        throw new ForbiddenError(
          `Access denied. Required: [${allowedRoles.join(' | ')}]. Your role: ${req.user.role}.`
        );
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

// ─────────────────────────────────────────────────────────────────
// SELF OR ADMIN
// ─────────────────────────────────────────────────────────────────

function selfOrAdmin(paramName = 'id') {
  return async function selfOrAdminGuard(req, res, next) {
    try {
      if (!req.user) throw new UnauthorizedError('Not authenticated.');
      const targetId = req.params[paramName];
      if (!targetId)  throw new UnauthorizedError(`Route param ':${paramName}' not found.`);
      if (req.user.id !== targetId && req.user.role !== 'Admin') {
        throw new ForbiddenError('You do not have permission to access this resource.');
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

// ─────────────────────────────────────────────────────────────────
// OPTIONAL AUTH
// ─────────────────────────────────────────────────────────────────

async function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null; req.academyId = null;
    return next();
  }
  return authenticate(req, res, next);
}

module.exports = {
  authenticate, extractTenant, requireRole, selfOrAdmin, optionalAuth, VALID_ROLES,
};
