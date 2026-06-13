// src/routes/chat.routes.js
'use strict';

/**
 * /api/chat
 *
 * GET  /api/chat?team_id=:uuid&limit=50&before=:messageUUID
 *   → All roles. Returns paginated team channel history.
 *     Supports cursor pagination via ?before=<message_id>.
 *
 * POST /api/chat
 *   → All roles. Sends a message to a team channel.
 *     Body: { team_id, message_text?, attachment_url?, file_name?, mime_type?, file_size? }
 *     At least one of message_text or attachment_url must be present.
 *
 * POST /api/chat/upload
 *   → All roles. Uploads a file to Supabase Storage and returns its public URL.
 *     Multipart: field "file" (required) + field "team_id" (required).
 *     Allowed types: JPEG, PNG, GIF, WebP, PDF. Max size: 10 MB.
 *     Returns: { url, file_name, mime_type, file_size }
 */

const multer       = require('multer');
const { Router }   = require('express');
const controller   = require('../controllers/chat.controller');
const { authenticate, extractTenant, requireRole } = require('../middleware/auth.middleware');
const { validateChatQuery, validateChatBody } = require('../middleware/validate');

const chatUpload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 10 * 1024 * 1024 },  // 10 MB
  fileFilter(_, file, cb) {
    if (/^(image\/(jpeg|jpg|png|gif|webp)|application\/pdf)$/.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only images (JPEG, PNG, GIF, WebP) and PDF files are allowed.'));
    }
  },
});

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

router.post(
  '/upload',
  requireRole('Admin', 'Coach', 'Player', 'Parent'),
  chatUpload.single('file'),
  controller.uploadAttachment
);

module.exports = router;
