'use strict';

const documentsService = require('../services/documents.service');

async function listDocuments(req, res, next) {
  try {
    const docs = await documentsService.listDocuments({
      academyId: req.academyId,
      userId:    req.user.id,
      role:      req.user.role,
      playerId:  req.query.player_id || null,
    });
    return res.status(200).json({ success: true, count: docs.length, data: { documents: docs } });
  } catch (err) { next(err); }
}

async function createDocument(req, res, next) {
  try {
    const { player_id, doc_type, file_name, file_url, file_size } = req.body;
    const doc = await documentsService.createDocument({
      academyId:  req.academyId,
      uploadedBy: req.user.id,
      playerId:   player_id,
      docType:    doc_type,
      fileName:   file_name,
      fileUrl:    file_url,
      fileSize:   file_size ? Number(file_size) : null,
    });
    return res.status(201).json({ success: true, data: { document: doc } });
  } catch (err) { next(err); }
}

async function deleteDocument(req, res, next) {
  try {
    await documentsService.deleteDocument({ academyId: req.academyId, documentId: req.params.id });
    return res.status(200).json({ success: true, message: 'Document deleted.' });
  } catch (err) { next(err); }
}

module.exports = { listDocuments, createDocument, deleteDocument };
