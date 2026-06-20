// src/routes/auth.routes.js
'use strict';

/**
 * Auth Routes
 * -----------
 * Public:    POST /signup  POST /login  POST /refresh
 * Protected: POST /logout  GET  /me
 */

const { Router }     = require('express');
const multer         = require('multer');
const controller     = require('../controllers/auth.controller');
const { authenticate, extractTenant } = require('../middleware/auth.middleware');

const AVATAR_MIME_EXT = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/jpg':  ['.jpg', '.jpeg'],
  'image/png':  ['.png'],
  'image/webp': ['.webp'],
  'image/gif':  ['.gif'],
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 5 * 1024 * 1024 },  // 5 MB
  fileFilter(_, file, cb) {
    const allowed = AVATAR_MIME_EXT[file.mimetype];
    if (!allowed) return cb(new Error('Only image files (JPEG, PNG, WebP, GIF) are allowed.'));
    const ext = file.originalname.slice(file.originalname.lastIndexOf('.')).toLowerCase();
    if (!allowed.includes(ext)) return cb(new Error('File extension does not match its content type.'));
    cb(null, true);
  },
});

const router = Router();

// ── Public ────────────────────────────────────────────────────────
router.post('/signup',           controller.signup);
router.post('/login',            controller.login);
router.post('/refresh',          controller.refresh);
router.get( '/invite/:token',    controller.verifyInviteToken);
router.post('/register',         controller.register);
router.post('/setup-account',    controller.setupAccount);
router.post('/forgot-password',  controller.forgotPassword);
router.post('/reset-password',   controller.resetPassword);

// ── Protected ─────────────────────────────────────────────────────
router.post(  '/logout',          authenticate,              controller.logout);
router.get(   '/me',              authenticate, extractTenant, controller.me);
router.patch( '/me',              authenticate, extractTenant, controller.updateProfile);
router.post(  '/change-password', authenticate,              controller.changePassword);
router.post(  '/avatar',          authenticate, upload.single('avatar'), controller.uploadAvatar);

module.exports = router;
