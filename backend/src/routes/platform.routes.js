'use strict';

/**
 * /api/platform  — SAMS SaaS control plane routes.
 *
 * POST  /api/platform/login                  — platform admin login (no auth)
 * GET   /api/platform/stats                  — dashboard KPIs
 * GET   /api/platform/requests               — list enrollment requests (?status=)
 * GET   /api/platform/requests/:id           — single request detail
 * POST  /api/platform/requests/:id/approve   — approve + provision academy
 * POST  /api/platform/requests/:id/reject    — reject with optional reason
 * GET   /api/platform/academies              — all provisioned academies
 *
 * All routes except /login require a valid platform admin JWT
 * via platformAuthenticate middleware. Academy JWTs are not accepted.
 */

const { Router }    = require('express');
const controller    = require('../controllers/platform.controller');
const { platformAuthenticate } = require('../middleware/platformAuth.middleware');

const router = Router();

// ── Public: login ──────────────────────────────────────────────
router.post('/login', controller.login);

// ── All routes below require platform admin auth ───────────────
router.use(platformAuthenticate);

router.get('/stats',                    controller.getStats);
router.get('/requests',                 controller.listRequests);
router.get('/requests/:id',             controller.getRequest);
router.post('/requests/:id/approve',    controller.approveRequest);
router.post('/requests/:id/reject',     controller.rejectRequest);
router.get('/academies',                controller.listAcademies);

module.exports = router;
