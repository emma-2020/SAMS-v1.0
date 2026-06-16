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

const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 5 * 1024 * 1024 },  // 5 MB
  fileFilter(_, file, cb) {
    if (/^image\/(jpeg|jpg|png|webp|gif)$/.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only image files are allowed.'));
  },
});

const router = Router();

// ── Public ────────────────────────────────────────────────────────
router.post('/signup',         controller.signup);
router.post('/login',          controller.login);
router.post('/refresh',        controller.refresh);
router.get( '/invite/:token',  controller.verifyInviteToken);
router.post('/register',       controller.register);
router.post('/setup-account',  controller.setupAccount);

// ── Protected ─────────────────────────────────────────────────────
router.post(  '/logout',          authenticate,              controller.logout);
router.get(   '/me',              authenticate, extractTenant, controller.me);
router.patch( '/me',              authenticate, extractTenant, controller.updateProfile);
router.post(  '/change-password', authenticate,              controller.changePassword);
router.post(  '/avatar',          authenticate, upload.single('avatar'), controller.uploadAvatar);

module.exports = router;
