'use strict';

/**
 * /api/announcements
 *
 * GET    /api/announcements      — list latest 20 (all roles)
 * POST   /api/announcements      — create announcement (Admin only)
 * DELETE /api/announcements/:id  — delete announcement (Admin only)
 */

const { Router } = require('express');
const controller = require('../controllers/announcements.controller');
const { authenticate, extractTenant, requireRole, requireAcademyPermission } = require('../middleware/auth.middleware');
const { validateAnnouncementBody } = require('../middleware/validate');

const router = Router();
router.use(authenticate, extractTenant);

const allRoles = ['Admin', 'Coach', 'Player', 'Parent'];

router.get(    '/',    requireRole(...allRoles),                               controller.listAnnouncements);
router.post(   '/',    requireRole('Admin', 'Coach'), requireAcademyPermission('coaches_can_post_announcements'), validateAnnouncementBody, controller.createAnnouncement);
router.delete( '/:id', requireRole('Admin'),                                   controller.deleteAnnouncement);

module.exports = router;
