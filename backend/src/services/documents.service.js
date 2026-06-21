'use strict';

const { supabaseAdmin } = require('../config/supabase');
const { NotFoundError, ForbiddenError, InternalError } = require('../utils/errors');

async function listDocuments({ academyId, userId, role, playerId }) {
  let targetPlayerIds = [];

  if (role === 'Player') {
    targetPlayerIds = [userId];
  } else if (role === 'Parent') {
    const { data: rosterRows } = await supabaseAdmin
      .from('rosters')
      .select('player_id')
      .eq('parent_id', userId)
      .eq('academy_id', academyId);
    targetPlayerIds = (rosterRows || []).map(r => r.player_id);
    if (targetPlayerIds.length === 0) return [];
  } else if (playerId) {
    targetPlayerIds = [playerId];
  }

  let query = supabaseAdmin
    .from('player_documents')
    .select(`
      id, doc_type, file_name, file_url, file_size, created_at,
      player:users!player_documents_player_id_fkey (id, first_name, last_name),
      uploader:users!player_documents_uploaded_by_fkey (id, first_name, last_name)
    `)
    .eq('academy_id', academyId)
    .order('created_at', { ascending: false });

  if (targetPlayerIds.length > 0) {
    query = query.in('player_id', targetPlayerIds);
  }

  const { data, error } = await query;
  if (error) throw new InternalError('Failed to fetch documents.');
  return data || [];
}

async function createDocument({ academyId, uploadedBy, playerId, docType, fileName, fileUrl, fileSize }) {
  const { data: player } = await supabaseAdmin
    .from('users')
    .select('id, role')
    .eq('id', playerId)
    .eq('academy_id', academyId)
    .single();

  if (!player) throw new NotFoundError('Player not found.');
  if (player.role !== 'Player') throw new ForbiddenError('Documents can only be added to Player profiles.');

  const { data, error } = await supabaseAdmin
    .from('player_documents')
    .insert({
      academy_id:  academyId,
      player_id:   playerId,
      doc_type:    docType,
      file_name:   fileName.trim(),
      file_url:    fileUrl.trim(),
      file_size:   fileSize || null,
      uploaded_by: uploadedBy,
    })
    .select(`
      id, doc_type, file_name, file_url, file_size, created_at,
      player:users!player_documents_player_id_fkey (id, first_name, last_name)
    `)
    .single();

  if (error) throw new InternalError('Failed to save document record.');
  return data;
}

async function deleteDocument({ academyId, documentId }) {
  const { data: existing } = await supabaseAdmin
    .from('player_documents')
    .select('id')
    .eq('id', documentId)
    .eq('academy_id', academyId)
    .single();

  if (!existing) throw new NotFoundError('Document not found.');

  const { error } = await supabaseAdmin
    .from('player_documents')
    .delete()
    .eq('id', documentId)
    .eq('academy_id', academyId);

  if (error) throw new InternalError('Failed to delete document record.');
}

module.exports = { listDocuments, createDocument, deleteDocument };
