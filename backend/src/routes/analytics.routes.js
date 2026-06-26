'use strict';

/**
 * /api/analytics
 *
 * GET /api/analytics/fees        — Admin only. Fee collection KPIs + charts.
 * GET /api/analytics/attendance  — Admin + Coach. Attendance rates + GFA compliance.
 * GET /api/analytics/wellness    — Admin + Coach. Squad wellness trend + player rankings.
 * GET /api/analytics/wellness/me — Player only. Own wellness trend + heatmap.
 */

const { Router }   = require('express');
const controller   = require('../controllers/analytics.controller');
const { authenticate, extractTenant, requireRole } = require('../middleware/auth.middleware');

const router = Router();

router.use(authenticate, extractTenant);

router.get('/fees',           requireRole('Admin'),                             controller.getFeeAnalytics);
router.get('/attendance',     requireRole('Admin', 'Coach'),                    controller.getAttendanceAnalytics);
router.get('/wellness',       requireRole('Admin', 'Coach'),                    controller.getWellnessAnalytics);
router.get('/wellness/me',    requireRole('Player', 'Admin'),                   controller.getMyWellnessAnalytics);
router.get('/parent',         requireRole('Parent', 'Admin'),                   controller.getParentAnalytics);
router.get('/workouts',       requireRole('Admin', 'Coach'),                    controller.getWorkoutAnalytics);
router.get('/teams',          requireRole('Admin'),                             controller.getTeamComparison);
router.get('/summary',        requireRole('Admin'),                             controller.getAnalyticsSummary);
router.get('/player/:id',     requireRole('Admin', 'Coach'),                    controller.getPlayerDetail);

module.exports = router;
