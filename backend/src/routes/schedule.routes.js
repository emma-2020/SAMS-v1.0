// src/routes/schedule.routes.js
'use strict';

/**
 * Schedule Routes
 * F-03 fix: POST / route added for event creation (Admin + Coach only).
 */

const { Router } = require('express');
const controller = require('../controllers/schedule.controller');
const { authenticate, extractTenant, requireRole } = require('../middleware/auth.middleware');
const {
  validateScheduleQuery,
  validateCreateEventBody,
  validateUpdateEventBody,
} = require('../middleware/validate');

const router = Router();

// All schedule routes require authentication + tenant context
router.use(authenticate, extractTenant);

// GET — all four roles can read their scoped schedule
router.get(
  '/',
  requireRole('Admin', 'Coach', 'Player', 'Parent'),
  validateScheduleQuery,
  controller.getEvents
);

router.get(
  '/:id',
  requireRole('Admin', 'Coach', 'Player', 'Parent'),
  controller.getEventById
);

// POST — only Admin and Coach may create events (F-03)
router.post(
  '/',
  requireRole('Admin', 'Coach'),
  validateCreateEventBody,
  controller.createEvent
);

// PUT — Admin and Coach may update events
router.put(
  '/:id',
  requireRole('Admin', 'Coach'),
  validateUpdateEventBody,
  controller.updateEvent
);

// DELETE — Admin and Coach may delete events
router.delete(
  '/:id',
  requireRole('Admin', 'Coach'),
  controller.deleteEvent
);

module.exports = router;
