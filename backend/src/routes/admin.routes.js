// src/routes/admin.routes.js
'use strict';

/**
 * /api/admin
 * All routes in this file are Admin-only. requireRole('Admin') applied globally.
 *
 * POST   /api/admin/invite
 *   Sends a new invitation to an email address for a specific role.
 *   Body: { email, role, first_name, last_name }
 *
 * GET    /api/admin/invite
 *   Lists all invitations for the academy.
 *   Optional: ?status=pending|accepted|expired
 *
 * DELETE /api/admin/invite/:id
 *   Revokes a pending (not yet accepted) invitation.
 */

const { Router }       = require('express');
const controller       = require('../controllers/admin.controller');
const { authenticate, extractTenant, requireRole } = require('../middleware/auth.middleware');
const { validateInviteBody } = require('../middleware/validate');

const router = Router();

// All admin routes require Admin role — gate the entire router
router.use(authenticate, extractTenant, requireRole('Admin'));

router.post(   '/invite',     validateInviteBody,  controller.createInvitation);
router.get(    '/invite',                          controller.listInvitations);
router.delete( '/invite/:id',                      controller.revokeInvitation);

module.exports = router;
