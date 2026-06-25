'use strict';

/**
 * /api/fees
 *
 * POST   /api/fees/webhook/paystack — Paystack webhook (no auth — verified by HMAC)
 * GET    /api/fees                  — list fees (role-scoped)
 * POST   /api/fees                  — create fee record (Admin only)
 * PATCH  /api/fees/:id              — update payment details (Admin only)
 * DELETE /api/fees/:id              — delete fee record (Admin only)
 */

const { Router } = require('express');
const controller = require('../controllers/fee.controller');
const { authenticate, extractTenant, requireRole } = require('../middleware/auth.middleware');
const { validateFeeBody } = require('../middleware/validate');

const router = Router();

// Webhook must be before authenticate — Paystack sends no Bearer token
router.post('/webhook/paystack', controller.webhookPaystack);

router.use(authenticate, extractTenant);

router.get(    '/',               requireRole('Admin', 'Coach', 'Player', 'Parent'), controller.listFees);
router.post(   '/',               requireRole('Admin'), validateFeeBody,             controller.createFee);
router.post(   '/send-reminders', requireRole('Admin'),                              controller.sendReminders);
router.patch(  '/:id',            requireRole('Admin'),                              controller.updateFee);
router.delete( '/:id',            requireRole('Admin'),                              controller.deleteFee);

module.exports = router;
