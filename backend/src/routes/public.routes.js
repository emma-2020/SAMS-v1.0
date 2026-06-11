'use strict';

/**
 * /api/public  — Unauthenticated public endpoints.
 *
 * POST /api/public/enroll — academy enrollment intake form.
 *   No auth required. Rate-limited to 5 requests per IP per hour
 *   to prevent spam. Sanitizes all inputs before DB insert.
 */

const { Router }    = require('express');
const rateLimit     = require('express-rate-limit');
const controller    = require('../controllers/public.controller');

const router = Router();

const enrollLimiter = rateLimit({
  windowMs:        60 * 60 * 1000,   // 1 hour
  max:             5,
  keyGenerator:    (req) => req.ip,
  message: {
    success: false,
    error: 'Too many enrollment requests from this IP. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders:   false,
});

router.post('/enroll', enrollLimiter, controller.submitEnrollment);

module.exports = router;
