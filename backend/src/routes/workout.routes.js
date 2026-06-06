// src/routes/workout.routes.js
'use strict';

/**
 * Workout Routes
 *
 * GET  /api/workouts       → All roles (scoped by role in service layer)
 * POST /api/workouts       → Admin, Coach only (create assignment)
 * POST /api/workouts/complete → Player only (toggle exercise checkbox)
 */

const { Router } = require('express');
const controller = require('../controllers/workout.controller');
const { authenticate, extractTenant, requireRole } = require('../middleware/auth.middleware');

const router = Router();
router.use(authenticate, extractTenant);

router.get(
  '/',
  requireRole('Admin', 'Coach', 'Player', 'Parent'),
  controller.getAssignments
);

router.post(
  '/',
  requireRole('Admin', 'Coach'),
  controller.createAssignment
);

router.post(
  '/complete',
  requireRole('Player'),
  controller.toggleCompletion
);

router.delete(
  '/:id',
  requireRole('Admin', 'Coach'),
  controller.deleteAssignment
);

module.exports = router;
