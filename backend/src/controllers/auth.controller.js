// src/controllers/auth.controller.js
'use strict';

/**
 * Auth Controller
 * ---------------
 * Thin HTTP layer only — no business logic here.
 * Validates presence of required body fields, delegates to AuthService,
 * then formats the response.
 *
 * Routes handled (see auth.routes.js):
 *   POST /api/auth/signup
 *   POST /api/auth/login
 *   POST /api/auth/logout
 *   POST /api/auth/refresh
 *   GET  /api/auth/me
 */

const authService  = require('../services/auth.service');
const { BadRequestError } = require('../utils/errors');


// ─────────────────────────────────────────────────────────────────
// POST /api/auth/signup
// Body: { email, password, role, first_name, last_name, academy_id }
// ─────────────────────────────────────────────────────────────────

async function signup(req, res, next) {
  try {
    const { email, password, role, first_name, last_name, academy_id } = req.body;

    if (!academy_id) {
      throw new BadRequestError('academy_id is required for signup.');
    }

    const result = await authService.signup({
      email, password, role, first_name, last_name, academy_id,
    });

    return res.status(201).json({
      success: true,
      message: result.message,
      data:    { profile: result.profile },
    });
  } catch (err) {
    next(err);
  }
}


// ─────────────────────────────────────────────────────────────────
// POST /api/auth/login
// Body: { email, password, academy_id }
// ─────────────────────────────────────────────────────────────────

async function login(req, res, next) {
  try {
    const { email, password, academy_id } = req.body;

    if (!academy_id) {
      throw new BadRequestError('academy_id is required for login.');
    }

    const result = await authService.login({ email, password, academy_id });

    return res.status(200).json({
      success: true,
      data:    result,      // { session: { access_token, ... }, profile: { ... } }
    });
  } catch (err) {
    next(err);
  }
}


// ─────────────────────────────────────────────────────────────────
// POST /api/auth/logout
// Header: Authorization: Bearer <token>
// (authenticate middleware must run first)
// ─────────────────────────────────────────────────────────────────

async function logout(req, res, next) {
  try {
    await authService.logout(req.accessToken);

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully. Please clear your local token.',
    });
  } catch (err) {
    next(err);
  }
}


// ─────────────────────────────────────────────────────────────────
// POST /api/auth/refresh
// Body: { refresh_token }
// ─────────────────────────────────────────────────────────────────

async function refresh(req, res, next) {
  try {
    const { refresh_token } = req.body;
    const session = await authService.refreshSession(refresh_token);

    return res.status(200).json({
      success: true,
      data:    { session },
    });
  } catch (err) {
    next(err);
  }
}


// ─────────────────────────────────────────────────────────────────
// GET /api/auth/me
// Header: Authorization: Bearer <token>
// ─────────────────────────────────────────────────────────────────

async function me(req, res, next) {
  try {
    const profile = await authService.getMe(req.user.id, req.user.academy_id);

    return res.status(200).json({
      success: true,
      data:    { profile },
    });
  } catch (err) {
    next(err);
  }
}


// ─────────────────────────────────────────────────────────────────
// PATCH /api/auth/me
// Body: { first_name, last_name }
// ─────────────────────────────────────────────────────────────────

async function updateProfile(req, res, next) {
  try {
    const { first_name, last_name } = req.body;
    const profile = await authService.updateProfile({
      userId:     req.user.id,
      academyId:  req.user.academy_id,
      first_name,
      last_name,
    });
    return res.status(200).json({ success: true, data: { profile } });
  } catch (err) { next(err); }
}

// ─────────────────────────────────────────────────────────────────
// POST /api/auth/change-password
// Body: { new_password }
// ─────────────────────────────────────────────────────────────────

async function changePassword(req, res, next) {
  try {
    const { new_password } = req.body;
    if (!new_password || new_password.length < 8) {
      throw new (require('../utils/errors').BadRequestError)(
        'Password must be at least 8 characters.'
      );
    }
    await authService.changePassword({ userId: req.user.id, newPassword: new_password });
    return res.status(200).json({ success: true, message: 'Password updated successfully.' });
  } catch (err) { next(err); }
}

module.exports = { signup, login, logout, refresh, me, updateProfile, changePassword };
