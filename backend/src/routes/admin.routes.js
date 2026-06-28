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
const multer           = require('multer');
const controller       = require('../controllers/admin.controller');
const regController    = require('../controllers/registration.controller');
const { authenticate, extractTenant, requireRole } = require('../middleware/auth.middleware');
const { validateInviteBody, validateMemberStatusBody, validateUpdateMemberBody, validateAvailabilityBody } = require('../middleware/validate');

const logoUpload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 2 * 1024 * 1024 }, // 2 MB for logos
  fileFilter(_, file, cb) {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error('Only JPEG, PNG, or WebP images are allowed for academy logos.'));
    }
    cb(null, true);
  },
});

const router = Router();

// All admin routes require Admin role — gate the entire router
router.use(authenticate, extractTenant, requireRole('Admin'));

router.post(   '/invite',     validateInviteBody,  controller.createInvitation);
router.get(    '/invite',                          controller.listInvitations);
router.delete( '/invite/:id',                      controller.revokeInvitation);
router.get(    '/roster',                          controller.listRoster);
router.get(    '/roster/:id',                      controller.getMemberDetail);
router.patch(  '/roster/:id',         validateUpdateMemberBody, controller.updateMember);
router.patch(  '/roster/:id/status',  validateMemberStatusBody, controller.setMemberStatus);
router.post(   '/roster/:id/reset-link',                              controller.getMemberResetLink);
router.patch(  '/roster/:id/availability', validateAvailabilityBody,  controller.updateAvailability);
router.get(    '/settings',                                             controller.getSettings);
router.patch(  '/settings',                                             controller.updateSettings);
router.post(   '/settings/logo', logoUpload.single('logo'),             controller.uploadLogo);

// Registration review routes
router.get(   '/registrations',              regController.listRegistrations);
router.get(   '/registrations/:id',          regController.getRegistration);
router.patch( '/registrations/:id/approve',  regController.approveRegistration);
router.patch( '/registrations/:id/reject',   regController.rejectRegistration);

module.exports = router;
