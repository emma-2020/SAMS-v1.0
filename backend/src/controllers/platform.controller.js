'use strict';

const service = require('../services/platform.service');

// POST /api/platform/login
async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const result = await service.login(email, password);
    return res.json({ success: true, data: result });
  } catch (err) { next(err); }
}

// GET /api/platform/stats
async function getStats(req, res, next) {
  try {
    const stats = await service.getStats();
    return res.json({ success: true, data: stats });
  } catch (err) { next(err); }
}

// GET /api/platform/requests?status=pending
async function listRequests(req, res, next) {
  try {
    const { status } = req.query;
    const requests = await service.listRequests(status || null);
    return res.json({ success: true, data: { requests } });
  } catch (err) { next(err); }
}

// GET /api/platform/requests/:id
async function getRequest(req, res, next) {
  try {
    const request = await service.getRequest(req.params.id);
    return res.json({ success: true, data: { request } });
  } catch (err) { next(err); }
}

// POST /api/platform/requests/:id/approve
async function approveRequest(req, res, next) {
  try {
    const result = await service.approveRequest(req.params.id, req.platformAdmin.id);
    return res.json({ success: true, data: result });
  } catch (err) { next(err); }
}

// POST /api/platform/requests/:id/reject
async function rejectRequest(req, res, next) {
  try {
    const { reason } = req.body;
    const result = await service.rejectRequest(req.params.id, req.platformAdmin.id, reason);
    return res.json({ success: true, data: result });
  } catch (err) { next(err); }
}

// GET /api/platform/academies
async function listAcademies(req, res, next) {
  try {
    const academies = await service.listAcademies();
    return res.json({ success: true, data: { academies } });
  } catch (err) { next(err); }
}

// POST /api/platform/mfa/setup — authenticated, generates TOTP secret + QR code
async function mfaSetup(req, res, next) {
  try {
    const result = await service.mfaSetup(req.platformAdmin.id);
    return res.json({ success: true, data: result });
  } catch (err) { next(err); }
}

// POST /api/platform/mfa/enable — authenticated, verifies first code and activates MFA
async function mfaEnable(req, res, next) {
  try {
    const { totp_code } = req.body;
    if (!totp_code) return res.status(400).json({ success: false, error: '"totp_code" is required.' });
    const result = await service.mfaEnable(req.platformAdmin.id, totp_code);
    return res.json({ success: true, data: result });
  } catch (err) { next(err); }
}

// POST /api/platform/mfa/verify — public, exchanges mfa_token + TOTP code for full JWT
async function mfaVerify(req, res, next) {
  try {
    const { mfa_token, totp_code } = req.body;
    if (!mfa_token || !totp_code) {
      return res.status(400).json({ success: false, error: '"mfa_token" and "totp_code" are required.' });
    }
    const result = await service.mfaVerify(mfa_token, totp_code);
    return res.json({ success: true, data: result });
  } catch (err) { next(err); }
}

module.exports = {
  login,
  mfaSetup,
  mfaEnable,
  mfaVerify,
  getStats,
  listRequests,
  getRequest,
  approveRequest,
  rejectRequest,
  listAcademies,
};
