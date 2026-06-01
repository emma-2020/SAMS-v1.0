// src/routes/auth.routes.js
'use strict';

/**
 * Auth Routes
 * -----------
 * Public:    POST /signup  POST /login  POST /refresh
 * Protected: POST /logout  GET  /me
 */

const { Router }     = require('express');
const controller     = require('../controllers/auth.controller');
const { authenticate, extractTenant } = require('../middleware/auth.middleware');

const router = Router();

// ── Public ────────────────────────────────────────────────────────
router.post('/signup',  controller.signup);
router.post('/login',   controller.login);
router.post('/refresh', controller.refresh);

// ── Protected ─────────────────────────────────────────────────────
router.post('/logout', authenticate, controller.logout);
router.get('/me',      authenticate, extractTenant, controller.me);

module.exports = router;
