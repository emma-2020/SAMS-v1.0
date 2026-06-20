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

const CHAT_MIME_EXT = {
  'image/jpeg':     ['.jpg', '.jpeg'],
  'image/jpg':      ['.jpg', '.jpeg'],
  'image/png':      ['.png'],
  'image/gif':      ['.gif'],
  'image/webp':     ['.webp'],
  'application/pdf': ['.pdf'],
};

const chatUpload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 10 * 1024 * 1024 },
  fileFilter(_, file, cb) {
    const allowed = CHAT_MIME_EXT[file.mimetype];
    if (!allowed) return cb(new Error('Only images (JPEG, PNG, GIF, WebP) and PDF files are allowed.'));
    const ext = file.originalname.slice(file.originalname.lastIndexOf('.')).toLowerCase();
    if (!allowed.includes(ext)) return cb(new Error('File extension does not match its content type.'));
    cb(null, true);
  },
});

const router = Router();
router.use(authenticate, extractTenant);

const allRoles = ['Admin', 'Coach', 'Player', 'Parent'];

// ── Channel management ────────────────────────────────────────────
router.get(  '/channels',                      requireRole(...allRoles), ch.listChannels);
router.post( '/channels',                      requireRole('Admin'),     validateCreateGroup, ch.createGroup);
router.get(  '/channels/:id/members',          requireRole(...allRoles), ch.getChannelMembers);
router.post( '/channels/:id/members',          requireRole('Admin'),     ch.addMember);
router.delete('/channels/:id/members/:userId', requireRole('Admin'),     ch.removeMember);
router.patch('/channels/:id',                  requireRole('Admin'),     ch.updateGroup);
router.delete('/channels/:id',                 requireRole('Admin'),     ch.deleteGroup);

// ── Leave / mute ──────────────────────────────────────────────────
router.delete('/channels/:id/leave',  requireRole(...allRoles), ch.leaveChannel);
router.patch( '/channels/:id/mute',   requireRole(...allRoles), ch.muteChannel);
router.patch( '/channels/:id/unmute', requireRole(...allRoles), ch.unmuteChannel);

// ── Block / unblock ───────────────────────────────────────────────
router.get(    '/block',          requireRole(...allRoles), ch.getBlockedUsers);
router.post(   '/block/:userId',  requireRole(...allRoles), ch.blockUser);
router.delete( '/block/:userId',  requireRole(...allRoles), ch.unblockUser);

// ── Report messages ───────────────────────────────────────────────
router.post(  '/messages/:messageId/report', requireRole(...allRoles), ch.reportMessage);
router.get(   '/admin/reports',              requireRole('Admin'),     ch.getReports);
router.patch( '/admin/reports/:reportId',    requireRole('Admin'),     ch.reviewReport);

// ── Academy chat policy settings (Admin only) ─────────────────────
router.get(   '/admin/settings', requireRole('Admin'), ch.getAcademySettings);
router.patch( '/admin/settings', requireRole('Admin'), ch.updateAcademySettings);

// ── Direct messages ───────────────────────────────────────────────
router.post('/direct',  requireRole(...allRoles), validateDirectBody, ch.getOrCreateDirect);

// ── User search (for DM / group member selection) ─────────────────
router.get('/users', requireRole(...allRoles), ch.searchUsers);

// ── Message CRUD ──────────────────────────────────────────────────
router.get(    '/',          requireRole(...allRoles), validateChatQuery, controller.getMessages);
router.post(   '/',          requireRole(...allRoles), validateChatBody,  controller.sendMessage);
router.post(   '/upload',    requireRole(...allRoles), chatUpload.single('file'), controller.uploadAttachment);
router.delete( '/:messageId',requireRole(...allRoles), controller.deleteMessage);

module.exports = router;
