'use strict';

/**
 * /api/registration  — Player-facing registration endpoints
 *
 * POST   /api/registration/upload    — upload a document file (Player only)
 * PUT    /api/registration/draft     — save draft (Player only)
 * POST   /api/registration/submit    — submit for admin review (Player only)
 * GET    /api/registration/me        — get own registration record (Player only)
 *
 * /api/admin/registrations           — Admin-facing (mounted in admin.routes.js)
 * GET    /api/admin/registrations           — list all registrations
 * GET    /api/admin/registrations/:id       — get one registration (full detail)
 * PATCH  /api/admin/registrations/:id/approve — approve
 * PATCH  /api/admin/registrations/:id/reject  — reject with reason
 */

const { Router } = require('express');
const multer = require('multer');
const controller = require('../controllers/registration.controller');
const { authenticate, extractTenant, requireRole } = require('../middleware/auth.middleware');

const docUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter(_, file, cb) {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error('Only JPEG, PNG, WebP, or PDF files are allowed.'));
    }
    cb(null, true);
  },
});

const router = Router();
router.use(authenticate, extractTenant, requireRole('Player'));

router.post('/upload',  docUpload.single('file'), controller.uploadDocument);
router.put( '/draft',                             controller.saveDraft);
router.post('/submit',                            controller.submitRegistration);
router.get( '/me',                                controller.getMyRegistration);

module.exports = router;
