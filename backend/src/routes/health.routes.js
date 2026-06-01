// src/routes/health.routes.js
'use strict';

/**
 * /api/health
 *
 * POST /api/health
 *   → Player only. Submits daily 3-metric check-in.
 *     Body: { fatigue: 1-5, soreness: 1-5, sleep_quality: 1-5, notes?: string }
 *     One submission per player per calendar day (409 on duplicate).
 *
 * GET  /api/health
 *   → All roles. Returns logs scoped by role:
 *       Player → own logs only
 *       Parent → linked child's logs (flagged entries highlighted)
 *       Coach  → all players on their teams; optional ?player_id= filter
 *       Admin  → all players in academy; optional ?player_id= filter
 *     Optional: ?days=N (default 30), ?player_id=UUID (Coach/Admin only)
 *
 * GET  /api/health/alerts
 *   → Parent/Coach/Admin only. Returns is_flagged=true entries.
 */

const { Router }       = require('express');
const controller       = require('../controllers/health.controller');
const { authenticate, extractTenant, requireRole } = require('../middleware/auth.middleware');
const { validateHealthBody } = require('../middleware/validate');

const router = Router();

router.use(authenticate, extractTenant);

// Alerts sub-route — must be declared before /:id-style routes
router.get(
  '/alerts',
  requireRole('Admin', 'Coach', 'Parent'),   // Players cannot see aggregate alerts
  controller.getActiveAlerts
);

router.post(
  '/',
  requireRole('Player'),                      // Only players submit health logs
  validateHealthBody,
  controller.submitHealthLog
);

router.get(
  '/',
  requireRole('Admin', 'Coach', 'Player', 'Parent'),
  controller.getHealthLogs
);

module.exports = router;
