'use strict';

const feeService = require('../services/fee.service');

async function listFees(req, res, next) {
  try {
    const fees = await feeService.listFees({
      academyId: req.academyId,
      userId:    req.user.id,
      role:      req.user.role,
      playerId:  req.query.player_id || null,
    });
    return res.status(200).json({ success: true, count: fees.length, data: { fees } });
  } catch (err) { next(err); }
}

async function createFee(req, res, next) {
  try {
    const { player_id, description, amount_owed, payment_method, payment_date, notes } = req.body;
    const fee = await feeService.createFee({
      academyId:     req.academyId,
      adminId:       req.user.id,
      playerId:      player_id,
      description,
      amountOwed:    Number(amount_owed),
      paymentMethod: payment_method || null,
      paymentDate:   payment_date   || null,
      notes:         notes          || null,
    });
    return res.status(201).json({ success: true, data: { fee } });
  } catch (err) { next(err); }
}

async function updateFee(req, res, next) {
  try {
    const { description, amount_owed, amount_paid, payment_method, payment_date, notes } = req.body;
    const fee = await feeService.updateFee({
      academyId:     req.academyId,
      feeId:         req.params.id,
      description,
      amountOwed:    amount_owed   !== undefined ? Number(amount_owed)  : undefined,
      amountPaid:    amount_paid   !== undefined ? Number(amount_paid)  : undefined,
      paymentMethod: payment_method,
      paymentDate:   payment_date,
      notes,
    });
    return res.status(200).json({ success: true, data: { fee } });
  } catch (err) { next(err); }
}

async function deleteFee(req, res, next) {
  try {
    await feeService.deleteFee({ academyId: req.academyId, feeId: req.params.id });
    return res.status(200).json({ success: true, message: 'Fee record deleted.' });
  } catch (err) { next(err); }
}

async function webhookPaystack(req, res, next) {
  try {
    const signature = req.headers['x-paystack-signature'];
    await feeService.handlePaystackWebhook({ rawBody: req.rawBody, signature });
    return res.status(200).json({ success: true });
  } catch (err) {
    if (err.message?.includes('signature')) {
      return res.status(400).json({ success: false, error: err.message });
    }
    next(err);
  }
}

async function sendReminders(req, res, next) {
  try {
    const result = await feeService.sendFeeReminderEmails({ academyId: req.academyId });
    return res.status(200).json({ success: true, data: result });
  } catch (err) { next(err); }
}

module.exports = { listFees, createFee, updateFee, deleteFee, webhookPaystack, sendReminders };
