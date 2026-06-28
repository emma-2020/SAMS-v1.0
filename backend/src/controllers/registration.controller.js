'use strict';

const svc = require('../services/registration.service');

// ─── PLAYER: Upload a single document file ────────────────────────────────────

async function uploadDocument(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'No file provided.' });
    const { docType } = req.body; // 'birth_certificate' | 'passport_photo' | 'national_id' | 'parent_consent'
    const allowed = ['birth_certificate', 'passport_photo', 'national_id', 'parent_consent'];
    if (!allowed.includes(docType)) {
      return res.status(400).json({ success: false, error: 'Invalid document type.' });
    }

    const storagePath = await svc.uploadDocument({
      academyId: req.academyId,
      playerId: req.user.id,
      docType,
      buffer: req.file.buffer,
      mimetype: req.file.mimetype,
      originalName: req.file.originalname,
    });

    res.json({ success: true, data: { storage_path: storagePath } });
  } catch (err) { next(err); }
}

// ─── PLAYER: Save draft ───────────────────────────────────────────────────────

async function saveDraft(req, res, next) {
  try {
    const data = await svc.saveDraft({
      playerId: req.user.id,
      academyId: req.academyId,
      fields: req.body,
    });
    res.json({ success: true, data: { registration: data } });
  } catch (err) { next(err); }
}

// ─── PLAYER: Submit registration ──────────────────────────────────────────────

async function submitRegistration(req, res, next) {
  try {
    const data = await svc.submitRegistration({
      playerId: req.user.id,
      academyId: req.academyId,
      fields: req.body,
    });
    res.json({ success: true, data: { registration: data } });
  } catch (err) { next(err); }
}

// ─── PLAYER: Get own registration ─────────────────────────────────────────────

async function getMyRegistration(req, res, next) {
  try {
    const data = await svc.getMyRegistration({
      playerId: req.user.id,
      academyId: req.academyId,
    });
    res.json({ success: true, data: { registration: data } });
  } catch (err) { next(err); }
}

// ─── ADMIN: List registrations ────────────────────────────────────────────────

async function listRegistrations(req, res, next) {
  try {
    const { status } = req.query;
    const data = await svc.listRegistrations({ academyId: req.academyId, status });
    res.json({ success: true, data: { registrations: data } });
  } catch (err) { next(err); }
}

// ─── ADMIN: Get single registration ──────────────────────────────────────────

async function getRegistration(req, res, next) {
  try {
    const data = await svc.getRegistration({ id: req.params.id, academyId: req.academyId });
    res.json({ success: true, data: { registration: data } });
  } catch (err) { next(err); }
}

// ─── ADMIN: Approve ───────────────────────────────────────────────────────────

async function approveRegistration(req, res, next) {
  try {
    const data = await svc.approveRegistration({
      id: req.params.id,
      adminId: req.user.id,
      academyId: req.academyId,
    });
    res.json({ success: true, data: { registration: data } });
  } catch (err) { next(err); }
}

// ─── ADMIN: Reject ────────────────────────────────────────────────────────────

async function rejectRegistration(req, res, next) {
  try {
    const { reason } = req.body;
    const data = await svc.rejectRegistration({
      id: req.params.id,
      adminId: req.user.id,
      academyId: req.academyId,
      reason,
    });
    res.json({ success: true, data: { registration: data } });
  } catch (err) { next(err); }
}

module.exports = {
  uploadDocument,
  saveDraft,
  submitRegistration,
  getMyRegistration,
  listRegistrations,
  getRegistration,
  approveRegistration,
  rejectRegistration,
};
