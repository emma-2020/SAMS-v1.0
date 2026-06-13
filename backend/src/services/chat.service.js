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
      id, team_id, sender_id, message_text, created_at,
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
// SEND MESSAGE
// ─────────────────────────────────────────────────────────────────

async function sendMessage({ teamId, senderId, academyId, role, messageText }) {
  await fetchTeamOrThrow(teamId, academyId);
  await assertTeamMembership({ teamId, userId: senderId, academyId, role });

  const cleanText = messageText.trim();
  if (cleanText.length === 0) {
    throw new BadRequestError('Message text cannot be blank after trimming.');
  }

  const { data, error } = await supabaseAdmin
    .from('messages')
    .insert({
      academy_id:   academyId,                // tenant isolation on insert
      team_id:      teamId,
      sender_id:    senderId,
      message_text: cleanText,
    })
    .select(`
      id, team_id, sender_id, message_text, created_at,
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

module.exports = { getMessages, sendMessage };
