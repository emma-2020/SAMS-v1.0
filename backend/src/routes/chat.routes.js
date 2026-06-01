// src/routes/chat.routes.js
'use strict';

/**
 * /api/chat
 *
 * GET  /api/chat?team_id=:uuid&limit=50&before=:messageUUID
 *   → All roles. Returns paginated team channel history.
 *     Caller must be a verified member of the team.
 *     Supports cursor pagination via ?before=<message_id>.
 *
 * POST /api/chat
 *   → All roles. Sends a text message to a team channel.
 *     Body: { team_id, message_text }
 *     Caller must be a verified member of the team.
 *     V1.0 — text only. No file attachments, no media.
 */

const { Router }       = require('express');
const controller       = require('../controllers/chat.controller');
const { authenticate, extractTenant, requireRole } = require('../middleware/auth.middleware');
const { validateChatQuery, validateChatBody } = require('../middleware/validate');

const router = Router();

router.use(authenticate, extractTenant);

router.get(
  '/',
  requireRole('Admin', 'Coach', 'Player', 'Parent'),
  validateChatQuery,
  controller.getMessages
);

router.post(
  '/',
  requireRole('Admin', 'Coach', 'Player', 'Parent'),
  validateChatBody,
  controller.sendMessage
);

module.exports = router;
