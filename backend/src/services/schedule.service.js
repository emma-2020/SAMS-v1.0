// src/services/schedule.service.js
'use strict';

/**
 * ScheduleService
 * ───────────────
 * Fixes applied:
 *   F-03  createEvent() added — POST /api/schedule now has a handler.
 *   F-04  Dead coach roster query removed from resolveAllowedTeamIds().
 *         Coaches are resolved ONLY via teams.coach_id — the rosters table
 *         stores players, not coaches, so the old .eq('player_id', userId)
 *         query always returned zero rows for coach users.
 */

const { supabaseAdmin }  = require('../config/supabase');
const { NotFoundError, ForbiddenError, BadRequestError, InternalError } = require('../utils/errors');
const notif = require('./notifications.service');

// ─────────────────────────────────────────────────────────────────
// GET EVENTS
// ─────────────────────────────────────────────────────────────────

async function getEvents({ userId, academyId, role, start, end, type, teamId }) {
  const allowedTeamIds = await resolveAllowedTeamIds({ userId, academyId, role });

  if (allowedTeamIds.length === 0) return [];

  let query = supabaseAdmin
    .from('events')
    .select(`
      id, academy_id, team_id, title, description,
      type, location, start_time, end_time,
      teams ( id, name, division, sport )
    `)
    .eq('academy_id', academyId)              // tenant isolation
    .in('team_id', allowedTeamIds)
    .order('start_time', { ascending: true });

  if (start) query = query.gte('start_time', new Date(start).toISOString());
  if (end)   query = query.lte('start_time', new Date(end).toISOString());
  if (type)  query = query.eq('type', type);

  if (teamId && ['Admin', 'Coach'].includes(role)) {
    if (!allowedTeamIds.includes(teamId)) {
      throw new ForbiddenError('You do not have access to this team.');
    }
    query = query.eq('team_id', teamId);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[ScheduleService.getEvents]', error.message);
    throw new InternalError('Failed to fetch schedule. Please try again.');
  }

  return data;
}

// ─────────────────────────────────────────────────────────────────
// GET SINGLE EVENT
// ─────────────────────────────────────────────────────────────────

async function getEventById({ eventId, userId, academyId, role }) {
  const allowedTeamIds = await resolveAllowedTeamIds({ userId, academyId, role });

  const { data, error } = await supabaseAdmin
    .from('events')
    .select(`
      id, academy_id, team_id, title, description,
      type, location, start_time, end_time,
      teams ( id, name, division, sport )
    `)
    .eq('id', eventId)
    .eq('academy_id', academyId)              // tenant isolation
    .in('team_id', allowedTeamIds)
    .single();

  if (error || !data) throw new NotFoundError('Event not found or access denied.');
  return data;
}

// ─────────────────────────────────────────────────────────────────
// F-03 FIX: CREATE EVENT
// Only Admin and Coach may create events.
// team_id must belong to this academy — prevents cross-tenant injection.
// ─────────────────────────────────────────────────────────────────

async function createEvent({ userId, academyId, role, payload }) {
  const { title, type, team_id, location, start_time, end_time, description } = payload;

  // Verify the target team exists in this academy
  const { data: team, error: teamError } = await supabaseAdmin
    .from('teams')
    .select('id')
    .eq('id', team_id)
    .eq('academy_id', academyId)              // tenant isolation
    .single();

  if (teamError || !team) {
    throw new BadRequestError('Team not found in this academy.');
  }

  // Coaches may only create events for their own teams
  if (role === 'Coach') {
    const allowedTeamIds = await resolveAllowedTeamIds({ userId, academyId, role });
    if (!allowedTeamIds.includes(team_id)) {
      throw new ForbiddenError('You can only create events for teams you are assigned to.');
    }
  }

  const { data, error } = await supabaseAdmin
    .from('events')
    .insert({
      academy_id:  academyId,                 // tenant isolation on insert
      team_id,
      created_by:  userId,
      title:       title.trim(),
      type,
      location:    location?.trim() || null,
      start_time:  new Date(start_time).toISOString(),
      end_time:    new Date(end_time).toISOString(),
      description: description?.trim() || null,
    })
    .select(`
      id, academy_id, team_id, title, description,
      type, location, start_time, end_time, created_at
    `)
    .single();

  if (error) {
    console.error('[ScheduleService.createEvent]', error.message);
    throw new InternalError('Failed to create event. Please try again.');
  }

  // Fire-and-forget: notify all players on the team about the new event
  (async () => {
    try {
      const { data: rosters } = await supabaseAdmin
        .from('rosters')
        .select('player_id')
        .eq('academy_id', academyId)
        .eq('team_id', team_id);
      const playerIds = (rosters || []).map(r => r.player_id);
      if (playerIds.length > 0) {
        const when = new Date(data.start_time).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
        await notif.createForMany({
          academyId,
          recipientIds: playerIds,
          type:  'schedule',
          title: `New session: ${data.title}`,
          body:  `Scheduled for ${when}${data.location ? ` at ${data.location}` : ''}.`,
          link:  '/dashboard/player/schedule',
        });
      }
    } catch (e) { console.error('[ScheduleService] notify error:', e.message); }
  })();

  return data;
}

// ─────────────────────────────────────────────────────────────────
// INTERNAL: RESOLVE ALLOWED TEAM IDs
// F-04 FIX: Removed the dead .eq('player_id', userId) roster query
// for coaches. Coaches are stored in teams.coach_id, NOT rosters.
// The old query always returned zero rows and silently blocked
// any coach who was not the teams.coach_id head coach.
// ─────────────────────────────────────────────────────────────────

async function resolveAllowedTeamIds({ userId, academyId, role }) {
  if (role === 'Admin') {
    const { data, error } = await supabaseAdmin
      .from('teams')
      .select('id')
      .eq('academy_id', academyId)            // tenant isolation
      .eq('is_active', true);

    if (error) {
      console.error('[ScheduleService.resolveAllowedTeamIds] Admin teams fetch:', error.message);
      throw new InternalError('Failed to resolve team access.');
    }
    return (data || []).map((t) => t.id);
  }

  if (role === 'Coach') {
    // F-04 FIX: Only query teams.coach_id — the only correct lookup for coaches.
    // Removed: rosters.player_id = coachId (coaches are not roster entries).
    const { data, error } = await supabaseAdmin
      .from('teams')
      .select('id')
      .eq('academy_id', academyId)            // tenant isolation
      .eq('coach_id', userId);

    if (error) {
      console.error('[ScheduleService.resolveAllowedTeamIds] Coach teams fetch:', error.message);
      throw new InternalError('Failed to resolve team access.');
    }
    return (data || []).map((t) => t.id);
  }

  if (role === 'Player') {
    const { data, error } = await supabaseAdmin
      .from('rosters')
      .select('team_id')
      .eq('academy_id', academyId)            // tenant isolation
      .eq('player_id', userId);

    if (error) {
      console.error('[ScheduleService.resolveAllowedTeamIds] Player roster fetch:', error.message);
      throw new InternalError('Failed to resolve team access.');
    }
    return (data || []).map((r) => r.team_id);
  }

  if (role === 'Parent') {
    const { data: links, error: linkError } = await supabaseAdmin
      .from('rosters')
      .select('player_id')
      .eq('academy_id', academyId)            // tenant isolation
      .eq('parent_id', userId);

    if (linkError) {
      console.error('[ScheduleService.resolveAllowedTeamIds] Parent links fetch:', linkError.message);
      throw new InternalError('Failed to resolve team access.');
    }
    if (!links || links.length === 0) return [];

    const childIds = links.map((l) => l.player_id);

    const { data: rosters, error: rosterError } = await supabaseAdmin
      .from('rosters')
      .select('team_id')
      .eq('academy_id', academyId)            // tenant isolation
      .in('player_id', childIds);

    if (rosterError) {
      console.error('[ScheduleService.resolveAllowedTeamIds] Child rosters fetch:', rosterError.message);
      throw new InternalError('Failed to resolve team access.');
    }
    return [...new Set((rosters || []).map((r) => r.team_id))];
  }

  return [];
}

// ─────────────────────────────────────────────────────────────────
// UPDATE EVENT
// Admin may update any academy event; Coach may only update their teams' events.
// ─────────────────────────────────────────────────────────────────

async function updateEvent({ eventId, userId, academyId, role, payload }) {
  const { data: existing, error: fetchErr } = await supabaseAdmin
    .from('events')
    .select('id, team_id')
    .eq('id', eventId)
    .eq('academy_id', academyId)
    .single();

  if (fetchErr || !existing) throw new NotFoundError('Event not found or access denied.');

  if (role === 'Coach') {
    const allowedTeamIds = await resolveAllowedTeamIds({ userId, academyId, role });
    if (!allowedTeamIds.includes(existing.team_id)) {
      throw new ForbiddenError('You can only update events for teams you are assigned to.');
    }
  }

  const { title, type, location, start_time, end_time, description } = payload;
  const updates = {};
  if (title       !== undefined) updates.title       = title.trim();
  if (type        !== undefined) updates.type        = type;
  if (location    !== undefined) updates.location    = location?.trim() || null;
  if (start_time  !== undefined) updates.start_time  = new Date(start_time).toISOString();
  if (end_time    !== undefined) updates.end_time    = new Date(end_time).toISOString();
  if (description !== undefined) updates.description = description?.trim() || null;

  const { data, error } = await supabaseAdmin
    .from('events')
    .update(updates)
    .eq('id', eventId)
    .eq('academy_id', academyId)
    .select('id, academy_id, team_id, title, description, type, location, start_time, end_time')
    .single();

  if (error) {
    console.error('[ScheduleService.updateEvent]', error.message);
    throw new InternalError('Failed to update event. Please try again.');
  }

  return data;
}

// ─────────────────────────────────────────────────────────────────
// DELETE EVENT
// Admin may delete any academy event; Coach may only delete their teams' events.
// ─────────────────────────────────────────────────────────────────

async function deleteEvent({ eventId, userId, academyId, role }) {
  const { data: existing, error: fetchErr } = await supabaseAdmin
    .from('events')
    .select('id, team_id')
    .eq('id', eventId)
    .eq('academy_id', academyId)
    .single();

  if (fetchErr || !existing) throw new NotFoundError('Event not found or access denied.');

  if (role === 'Coach') {
    const allowedTeamIds = await resolveAllowedTeamIds({ userId, academyId, role });
    if (!allowedTeamIds.includes(existing.team_id)) {
      throw new ForbiddenError('You can only delete events for teams you are assigned to.');
    }
  }

  const { error } = await supabaseAdmin
    .from('events')
    .delete()
    .eq('id', eventId)
    .eq('academy_id', academyId);

  if (error) {
    console.error('[ScheduleService.deleteEvent]', error.message);
    throw new InternalError('Failed to delete event. Please try again.');
  }
}

module.exports = { getEvents, getEventById, createEvent, updateEvent, deleteEvent, resolveAllowedTeamIds };
