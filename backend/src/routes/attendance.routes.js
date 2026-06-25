// src/routes/attendance.routes.js
'use strict';

/**
 * /api/attendance
 *
 * GET  /api/attendance?event_id=:uuid
 *   → Coach/Admin only.
 *     Returns full player roster for the event with current attendance states.
 *
 * POST /api/attendance
 *   → Coach/Admin only.
 *     Body: { event_id, records: [{ player_id, status, notes? }] }
 *     Bulk-upserts attendance. Idempotent — safe to re-submit full tap-list.
 *
 * Players and Parents are explicitly blocked at the route level.
 * Additional team-ownership check occurs inside AttendanceService.
 */

const { Router }       = require('express');
const controller       = require('../controllers/attendance.controller');
const { authenticate, extractTenant, requireRole, requireAcademyPermission } = require('../middleware/auth.middleware');
const { validateAttendanceQuery, validateAttendanceBody } = require('../middleware/validate');

const router = Router();

router.use(authenticate, extractTenant);

router.get(
  '/',
  requireRole('Admin', 'Coach'),   // Players & Parents blocked
  validateAttendanceQuery,
  controller.getRosterWithAttendance
);

router.post(
  '/',
  requireRole('Admin', 'Coach'),   // Players & Parents blocked
  validateAttendanceBody,
  controller.logAttendance
);

router.get(
  '/export',
  requireRole('Admin', 'Coach'),
  controller.exportAttendanceCsv
);

// GET /api/attendance/children — Parent view of their children's attendance history.
// Requires the academy to have parents_can_view_attendance = true.
router.get(
  '/children',
  requireRole('Parent'),
  requireAcademyPermission('parents_can_view_attendance'),
  controller.getChildAttendance
);

module.exports = router;
