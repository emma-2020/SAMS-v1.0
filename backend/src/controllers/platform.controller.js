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

module.exports = {
  login,
  getStats,
  listRequests,
  getRequest,
  approveRequest,
  rejectRequest,
  listAcademies,
};
