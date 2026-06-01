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
const { authenticate, extractTenant, requireRole } = require('../middleware/auth.middleware');
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

module.exports = router;
