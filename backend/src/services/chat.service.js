// src/services/chat.service.js
'use strict';

/**
 * ChatService
 * Fixes applied:
 *   F-04  assertTeamMembership(): removed dead rosters.player_id = coachId query.
 *         Coaches are found only via teams.coach_id.
 *   F-07  Raw Supabase error strings replaced with safe logged messages.
 */

const crypto        = require('crypto');
const { supabaseAdmin } = require('../config/supabase');
const {
  ForbiddenError,
  NotFoundError,
  BadRequestError,
  InternalError,
} = require('../utils/errors');

const ATTACHMENT_BUCKET = 'chat-attachments';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT     = 100;

// ─────────────────────────────────────────────────────────────────
// GET MESSAGES
// ─────────────────────────────────────────────────────────────────

async function getMessages({ teamId, userId, academyId, role, limit, before }) {
  const team     = await fetchTeamOrThrow(teamId, academyId);
  await assertTeamMembership({ teamId, userId, academyId, role });

  const pageSize = Math.min(Number(limit) || DEFAULT_LIMIT, MAX_LIMIT);

  let query = supabaseAdmin
    .from('messages')
    .select(`
      id, team_id, sender_id, message_text,
      attachment_url, file_name, mime_type, file_size,
      created_at,
      users!messages_sender_id_fkey ( id, first_name, last_name, role )
    `)
    .eq('academy_id', academyId)              // tenant isolation
    .eq('team_id', teamId)
    .order('created_at', { ascending: false })
    .limit(pageSize);

  if (before) {
    const { data: cursor } = await supabaseAdmin
      .from('messages')
      .select('created_at')
      .eq('id', before)
      .eq('academy_id', academyId)            // tenant isolation
      .single();

    if (cursor) query = query.lt('created_at', cursor.created_at);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[ChatService.getMessages]', error.message);
    throw new InternalError('Failed to fetch messages. Please try again.');
  }

  const messages = (data || []).reverse();

  return {
    team:     { id: team.id, name: team.name },
    messages,
    page: {
      count:     messages.length,
      limit:     pageSize,
      has_more:  messages.length === pageSize,
      oldest_id: messages[0]?.id ?? null,
    },
  };
}

// ─────────────────────────────────────────────────────────────────
// UPLOAD ATTACHMENT
// Uploads a file buffer to Supabase Storage and returns metadata.
// The caller is responsible for then sending a message with the URL.
// ─────────────────────────────────────────────────────────────────

async function uploadAttachment({ teamId, userId, academyId, role, fileBuffer, mimetype, originalname, fileSize }) {
  await fetchTeamOrThrow(teamId, academyId);
  await assertTeamMembership({ teamId, userId, academyId, role });

  const ext      = (originalname.split('.').pop() || 'bin').toLowerCase();
  const safeName = originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `${academyId}/${teamId}/${Date.now()}_${crypto.randomBytes(4).toString('hex')}_${safeName}`;

  const { error: uploadError } = await supabaseAdmin
    .storage
    .from(ATTACHMENT_BUCKET)
    .upload(storagePath, fileBuffer, { contentType: mimetype, upsert: false });

  if (uploadError) {
    console.error('[ChatService.uploadAttachment] storage upload failed:', uploadError.message);
    throw new InternalError('File upload failed. Please try again.');
  }

  const { data: { publicUrl } } = supabaseAdmin
    .storage
    .from(ATTACHMENT_BUCKET)
    .getPublicUrl(storagePath);

  return { url: publicUrl, file_name: originalname, mime_type: mimetype, file_size: fileSize };
}

// ─────────────────────────────────────────────────────────────────
// SEND MESSAGE
// ─────────────────────────────────────────────────────────────────

async function sendMessage({ teamId, senderId, academyId, role, messageText, attachmentUrl, fileName, mimeType, fileSize }) {
  await fetchTeamOrThrow(teamId, academyId);
  await assertTeamMembership({ teamId, userId: senderId, academyId, role });

  const cleanText = messageText ? messageText.trim() : null;
  if (!cleanText && !attachmentUrl) {
    throw new BadRequestError('Message must contain text or an attachment.');
  }

  const { data, error } = await supabaseAdmin
    .from('messages')
    .insert({
      academy_id:     academyId,
      team_id:        teamId,
      sender_id:      senderId,
      message_text:   cleanText   || null,
      attachment_url: attachmentUrl || null,
      file_name:      fileName    || null,
      mime_type:      mimeType    || null,
      file_size:      fileSize    || null,
    })
    .select(`
      id, team_id, sender_id, message_text,
      attachment_url, file_name, mime_type, file_size,
      created_at,
      users!messages_sender_id_fkey ( id, first_name, last_name, role )
    `)
    .single();

  if (error) {
    console.error('[ChatService.sendMessage]', error.message);
    throw new InternalError('Failed to send message. Please try again.');
  }
  return data;
}

// ─────────────────────────────────────────────────────────────────
// INTERNAL HELPERS
// ─────────────────────────────────────────────────────────────────

async function fetchTeamOrThrow(teamId, academyId) {
  const { data, error } = await supabaseAdmin
    .from('teams')
    .select('id, name, academy_id')
    .eq('id', teamId)
    .eq('academy_id', academyId)              // tenant isolation
    .single();

  if (error || !data) throw new NotFoundError('Team not found in this academy.');
  return data;
}

/**
 * assertTeamMembership
 * F-04 FIX: For the Coach role, only check teams.coach_id.
 * The previous implementation also queried rosters.player_id = coachId,
 * which always returned null (coaches are not roster entries) and
 * would throw ForbiddenError for any coach not set as head_coach.
 */
async function assertTeamMembership({ teamId, userId, academyId, role }) {
  if (role === 'Admin') return;              // Admins have full academy access

  if (role === 'Coach') {
    // F-04 FIX: Correct lookup — teams.coach_id only
    const { data: team } = await supabaseAdmin
      .from('teams')
      .select('coach_id')
      .eq('id', teamId)
      .eq('academy_id', academyId)            // tenant isolation
      .single();

    if (team?.coach_id === userId) return;
    throw new ForbiddenError('You are not the head coach of this team.');
  }

  if (role === 'Player') {
    const { data } = await supabaseAdmin
      .from('rosters')
      .select('id')
      .eq('team_id', teamId)
      .eq('academy_id', academyId)            // tenant isolation
      .eq('player_id', userId)
      .maybeSingle();

    if (!data) throw new ForbiddenError('You are not rostered on this team.');
    return;
  }

  if (role === 'Parent') {
    const { data: links } = await supabaseAdmin
      .from('rosters')
      .select('player_id')
      .eq('academy_id', academyId)            // tenant isolation
      .eq('parent_id', userId);

    const childIds = (links || []).map((l) => l.player_id);
    if (childIds.length === 0) throw new ForbiddenError('No linked children found.');

    const { data: childOnTeam } = await supabaseAdmin
      .from('rosters')
      .select('id')
      .eq('team_id', teamId)
      .eq('academy_id', academyId)            // tenant isolation
      .in('player_id', childIds)
      .maybeSingle();

    if (!childOnTeam) {
      throw new ForbiddenError('Your child is not on this team.');
    }
    return;
  }

  throw new ForbiddenError('Unrecognised role. Access denied.');
}

module.exports = { getMessages, sendMessage, uploadAttachment };
