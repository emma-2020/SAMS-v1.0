// src/routes/chat.routes.js
'use strict';

const multer     = require('multer');
const { Router } = require('express');
const controller = require('../controllers/chat.controller');
const ch         = require('../controllers/chat_channels.controller');
const { authenticate, extractTenant, requireRole } = require('../middleware/auth.middleware');
const {
  validateChatQuery,
  validateChatBody,
  validateCreateGroup,
  validateDirectBody,
} = require('../middleware/validate');

const chatUpload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 10 * 1024 * 1024 },
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

const allRoles = ['Admin', 'Coach', 'Player', 'Parent'];

// ── Channel management ────────────────────────────────────────────
router.get(  '/channels',                    requireRole(...allRoles), ch.listChannels);
router.post( '/channels',                    requireRole('Admin'),     validateCreateGroup, ch.createGroup);
router.get(  '/channels/:id/members',        requireRole(...allRoles), ch.getChannelMembers);
router.post( '/channels/:id/members',        requireRole('Admin'),     ch.addMember);
router.delete('/channels/:id/members/:userId', requireRole('Admin'),   ch.removeMember);
router.patch('/channels/:id',                requireRole('Admin'),     ch.updateGroup);
router.delete('/channels/:id',               requireRole('Admin'),     ch.deleteGroup);

// ── Direct messages ───────────────────────────────────────────────
router.post('/direct',                       requireRole(...allRoles), validateDirectBody, ch.getOrCreateDirect);

// ── User search (for DM / group member selection) ─────────────────
router.get('/users',                         requireRole(...allRoles), ch.searchUsers);

// ── Message CRUD ──────────────────────────────────────────────────
router.get(    '/',          requireRole(...allRoles), validateChatQuery, controller.getMessages);
router.post(   '/',          requireRole(...allRoles), validateChatBody,  controller.sendMessage);
router.post(   '/upload',    requireRole(...allRoles), chatUpload.single('file'), controller.uploadAttachment);
router.delete( '/:messageId',requireRole(...allRoles), controller.deleteMessage);

module.exports = router;
