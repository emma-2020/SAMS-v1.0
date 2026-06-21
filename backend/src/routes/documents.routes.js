'use strict';

/**
 * /api/documents
 *
 * GET    /api/documents             — list documents (role-scoped; ?player_id= for Admin/Coach)
 * POST   /api/documents             — save document metadata after client uploads to Supabase Storage
 * DELETE /api/documents/:id         — delete document record (Admin only; client removes from Storage separately)
 *
 * File upload flow:
 *   1. Client uploads file to Supabase Storage bucket 'player-documents' and receives a file_url.
 *   2. Client calls POST /api/documents with { player_id, doc_type, file_name, file_url, file_size }.
 *   3. Backend saves metadata to player_documents table.
 */

const { Router } = require('express');
const controller = require('../controllers/documents.controller');
const { authenticate, extractTenant, requireRole } = require('../middleware/auth.middleware');
const { validateDocumentBody } = require('../middleware/validate');

const router = Router();
router.use(authenticate, extractTenant);

router.get(    '/',    requireRole('Admin', 'Coach', 'Player', 'Parent'), controller.listDocuments);
router.post(   '/',    requireRole('Admin', 'Coach'), validateDocumentBody, controller.createDocument);
router.delete( '/:id', requireRole('Admin'),                               controller.deleteDocument);

module.exports = router;
