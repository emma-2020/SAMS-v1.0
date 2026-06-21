'use strict';

/**
 * /api/fees
 *
 * GET    /api/fees            — list fees (role-scoped: Admin/Coach=all or by ?player_id; Player=own; Parent=children)
 * POST   /api/fees            — create fee record (Admin only)
 * PATCH  /api/fees/:id        — update payment details (Admin only)
 * DELETE /api/fees/:id        — delete fee record (Admin only)
 */

const { Router } = require('express');
const controller = require('../controllers/fee.controller');
const { authenticate, extractTenant, requireRole } = require('../middleware/auth.middleware');
const { validateFeeBody } = require('../middleware/validate');

const router = Router();
router.use(authenticate, extractTenant);

router.get(    '/',    requireRole('Admin', 'Coach', 'Player', 'Parent'), controller.listFees);
router.post(   '/',    requireRole('Admin'), validateFeeBody,             controller.createFee);
router.patch(  '/:id', requireRole('Admin'),                              controller.updateFee);
router.delete( '/:id', requireRole('Admin'),                              controller.deleteFee);

module.exports = router;
