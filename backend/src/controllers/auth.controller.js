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
 *   POST /api/auth/login
 *   POST /api/auth/logout
 *   POST /api/auth/refresh
 *   GET  /api/auth/me
 */

const authService         = require('../services/auth.service');
const { BadRequestError } = require('../utils/errors');


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

    const ip = req.ip || req.socket?.remoteAddress;
    const result = await authService.login({ email, password, academy_id, ip });

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
    await authService.logout(req.accessToken, {
      userId:    req.user?.id,
      email:     req.user?.email,
      academyId: req.user?.academy_id,
      ip:        req.ip || req.socket?.remoteAddress,
    });

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
    await authService.changePassword({
      userId:    req.user.id,
      email:     req.user.email,
      academyId: req.user.academy_id,
      newPassword: new_password,
      ip:        req.ip || req.socket?.remoteAddress,
    });
    return res.status(200).json({ success: true, message: 'Password updated successfully.' });
  } catch (err) { next(err); }
}

// ─────────────────────────────────────────────────────────────────
// GET /api/auth/invite/:token
// Public — returns invitation preview so the frontend can pre-fill.
// ─────────────────────────────────────────────────────────────────

async function verifyInviteToken(req, res, next) {
  try {
    const details = await authService.verifyInviteToken(req.params.token);
    return res.status(200).json({ success: true, data: { invite: details } });
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────────
// POST /api/auth/register
// Public — body: { token, password, date_of_birth?, terms_accepted }
// date_of_birth is optional. terms_accepted must be boolean `true` —
// enforced in authService.registerByInvitation.
// ─────────────────────────────────────────────────────────────────

async function register(req, res, next) {
  try {
    const { token, password, date_of_birth, terms_accepted } = req.body;
    if (!token)    throw new BadRequestError('Invitation token is required.');
    if (!password) throw new BadRequestError('Password is required.');

    const result = await authService.registerByInvitation({
      token,
      password,
      date_of_birth,
      terms_accepted,
    });
    return res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────────
// POST /api/auth/avatar
// multipart/form-data: field "avatar" (image file)
// ─────────────────────────────────────────────────────────────────

async function uploadAvatar(req, res, next) {
  try {
    if (!req.file) throw new BadRequestError('No image file provided.');
    const profile = await authService.uploadAvatar({
      userId:       req.user.id,
      academyId:    req.user.academy_id,
      fileBuffer:   req.file.buffer,
      mimetype:     req.file.mimetype,
      originalname: req.file.originalname,
    });
    return res.status(200).json({ success: true, data: { profile } });
  } catch (err) { next(err); }
}

// ─────────────────────────────────────────────────────────────────
// POST /api/auth/setup-account
// Public — body: { token, password }
// ─────────────────────────────────────────────────────────────────

async function setupAccount(req, res, next) {
  try {
    const { token, password } = req.body;
    if (!token)    throw new BadRequestError('Setup token is required.');
    if (!password) throw new BadRequestError('Password is required.');
    const result = await authService.setupAccount({ token, password });
    return res.status(200).json({ success: true, data: result });
  } catch (err) { next(err); }
}

// ─────────────────────────────────────────────────────────────────
// POST /api/auth/forgot-password
// Public — body: { email }
// Always returns 200 to prevent email enumeration.
// ─────────────────────────────────────────────────────────────────

async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string') {
      throw new BadRequestError('Email address is required.');
    }
    // Fire-and-forget — service never throws (silent on missing user)
    authService.forgotPassword(email.trim());
    return res.json({
      success: true,
      message: 'If that email is registered, a password reset link has been sent.',
    });
  } catch (err) { next(err); }
}

// ─────────────────────────────────────────────────────────────────
// POST /api/auth/reset-password
// Public — body: { access_token, new_password }
// ─────────────────────────────────────────────────────────────────

async function resetPassword(req, res, next) {
  try {
    const { access_token, new_password } = req.body;
    if (!access_token) throw new BadRequestError('Reset token is required.');
    if (!new_password) throw new BadRequestError('New password is required.');
    await authService.resetPassword(access_token, new_password);
    return res.json({ success: true, message: 'Password updated successfully. You can now log in.' });
  } catch (err) { next(err); }
}

// ─────────────────────────────────────────────────────────────────
// GET /api/auth/preferences
// ─────────────────────────────────────────────────────────────────

async function getPreferences(req, res, next) {
  try {
    const prefs = await authService.getPreferences({
      userId:    req.user.id,
      academyId: req.user.academy_id,
    });
    return res.status(200).json({ success: true, data: { preferences: prefs } });
  } catch (err) { next(err); }
}

// ─────────────────────────────────────────────────────────────────
// PATCH /api/auth/preferences
// Body: partial preferences object (top-level keys merged)
// ─────────────────────────────────────────────────────────────────

async function updatePreferences(req, res, next) {
  try {
    const prefs = await authService.updatePreferences({
      userId:      req.user.id,
      academyId:   req.user.academy_id,
      preferences: req.body,
    });
    return res.status(200).json({ success: true, data: { preferences: prefs } });
  } catch (err) { next(err); }
}

// ─────────────────────────────────────────────────────────────────
// GET /api/auth/export
// Self-service data export.
// ─────────────────────────────────────────────────────────────────

async function exportData(req, res, next) {
  try {
    const data = await authService.exportOwnData({
      userId:    req.user.id,
      academyId: req.user.academy_id,
      role:      req.user.role,
    });
    return res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────────
// DELETE /api/auth/me
// Self-service account deletion.
// ─────────────────────────────────────────────────────────────────

async function deleteAccount(req, res, next) {
  try {
    const result = await authService.deleteOwnAccount({
      userId:    req.user.id,
      academyId: req.user.academy_id,
      role:      req.user.role,
    });
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

module.exports = { login, logout, refresh, me, updateProfile, changePassword, verifyInviteToken, register, uploadAvatar, setupAccount, forgotPassword, resetPassword, getPreferences, updatePreferences, exportData, deleteAccount };
