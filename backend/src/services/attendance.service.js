// src/services/attendance.service.js
'use strict';

/**
 * AttendanceService
 * Fixes applied:
 *   F-04  assertTeamAccess(): removed dead rosters.player_id = coachId query.
 *         Coaches are found only via teams.coach_id. The old roster query
 *         always returned zero rows for a coach and would have thrown
 *         ForbiddenError for any coach who isn't the team's head_coach.
 *   F-07  Raw Supabase error strings replaced with safe logged messages.
 */

const { supabaseAdmin }   = require('../config/supabase');
const {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
  InternalError,
} = require('../utils/errors');

// ─────────────────────────────────────────────────────────────────
// GET ROSTER + ATTENDANCE FOR AN EVENT
// ─────────────────────────────────────────────────────────────────

async function getRosterWithAttendance({ eventId, academyId, userId, role }) {
  const event = await fetchEventOrThrow(eventId, academyId);
  await assertTeamAccess({ teamId: event.team_id, userId, academyId, role });

  const { data: rosterRows, error: rosterError } = await supabaseAdmin
    .from('rosters')
    .select(`
      player_id,
      users!rosters_player_id_fkey (
        id, first_name, last_name, email
      )
    `)
    .eq('academy_id', academyId)              // tenant isolation
    .eq('team_id', event.team_id);

  if (rosterError) {
    console.error('[AttendanceService.getRosterWithAttendance] roster fetch:', rosterError.message);
    throw new InternalError('Failed to fetch roster. Please try again.');
  }

  const { data: attendanceRows, error: attError } = await supabaseAdmin
    .from('attendance')
    .select('player_id, status, notes, updated_at')
    .eq('academy_id', academyId)              // tenant isolation
    .eq('event_id', eventId);

  if (attError) {
    console.error('[AttendanceService.getRosterWithAttendance] attendance fetch:', attError.message);
    throw new InternalError('Failed to fetch attendance records. Please try again.');
  }

  const attendanceMap = Object.fromEntries(
    (attendanceRows || []).map((a) => [a.player_id, a])
  );

  const roster = (rosterRows || []).map((r) => ({
    player_id:  r.player_id,
    first_name: r.users?.first_name,
    last_name:  r.users?.last_name,
    email:      r.users?.email,
    status:     attendanceMap[r.player_id]?.status     ?? null,
    notes:      attendanceMap[r.player_id]?.notes      ?? null,
    updated_at: attendanceMap[r.player_id]?.updated_at ?? null,
  }));

  return {
    event: {
      id:         event.id,
      title:      event.title,
      type:       event.type,
      start_time: event.start_time,
      location:   event.location,
    },
    roster,
    summary: buildSummary(roster),
  };
}

// ─────────────────────────────────────────────────────────────────
// UPSERT ATTENDANCE RECORDS
// ─────────────────────────────────────────────────────────────────

async function logAttendance({ eventId, academyId, loggedBy, role, records }) {
  const event = await fetchEventOrThrow(eventId, academyId);
  await assertTeamAccess({ teamId: event.team_id, userId: loggedBy, academyId, role });

  // Validate submitted player_ids all belong to this team
  const { data: validRoster } = await supabaseAdmin
    .from('rosters')
    .select('player_id')
    .eq('academy_id', academyId)              // tenant isolation
    .eq('team_id', event.team_id);

  const validPlayerIds = new Set((validRoster || []).map((r) => r.player_id));

  const invalidPlayers = records.filter((r) => !validPlayerIds.has(r.player_id));
  if (invalidPlayers.length > 0) {
    throw new BadRequestError(
      `The following player IDs are not on this team: ${invalidPlayers.map((r) => r.player_id).join(', ')}`
    );
  }

  const upsertRows = records.map((rec) => ({
    academy_id: academyId,                    // tenant isolation on every row
    event_id:   eventId,
    player_id:  rec.player_id,
    status:     rec.status,
    notes:      rec.notes || null,
    logged_by:  loggedBy,
    updated_at: new Date().toISOString(),
  }));

  const { data, error } = await supabaseAdmin
    .from('attendance')
    .upsert(upsertRows, {
      onConflict:       'event_id,player_id',
      ignoreDuplicates: false,
    })
    .select('id, player_id, status, updated_at');

  if (error) {
    console.error('[AttendanceService.logAttendance] upsert failed:', error.message);
    throw new InternalError('Failed to save attendance. Please try again.');
  }

  return { saved: data.length, records: data };
}

// ─────────────────────────────────────────────────────────────────
// INTERNAL HELPERS
// ─────────────────────────────────────────────────────────────────

async function fetchEventOrThrow(eventId, academyId) {
  const { data, error } = await supabaseAdmin
    .from('events')
    .select('id, team_id, title, type, start_time, location, academy_id')
    .eq('id', eventId)
    .eq('academy_id', academyId)              // tenant isolation
    .single();

  if (error || !data) throw new NotFoundError('Event not found in this academy.');
  return data;
}

/**
 * assertTeamAccess
 * F-04 FIX: Removed the dead rosters.player_id = coachId query.
 * Coaches are stored in teams.coach_id ONLY. The roster table stores
 * player-to-team mappings; querying it for a coach UUID always returned
 * zero rows and caused ForbiddenError for non-head-coach users.
 */
async function assertTeamAccess({ teamId, userId, academyId, role }) {
  if (role === 'Admin') return;              // Admins have full academy access

  if (role !== 'Coach') {
    throw new ForbiddenError('Only Coaches and Admins may access attendance records.');
  }

  // F-04 FIX: Correct lookup — check teams.coach_id only
  const { data: teamRow } = await supabaseAdmin
    .from('teams')
    .select('id, coach_id')
    .eq('id', teamId)
    .eq('academy_id', academyId)              // tenant isolation
    .single();

  if (teamRow?.coach_id === userId) return;  // head coach — access granted

  // If not the head coach, deny access.
  // (V1.1 can extend this with a team_coaches junction table for assistant coaches.)
  throw new ForbiddenError('You are not assigned as head coach of this team.');
}

function buildSummary(roster) {
  const counts = { Present: 0, Absent: 0, Injured: 0, Pending: 0 };
  for (const p of roster) {
    const key = p.status ?? 'Pending';
    counts[key] = (counts[key] || 0) + 1;
  }
  return { total: roster.length, ...counts };
}

// ─────────────────────────────────────────────────────────────────
// EXPORT ATTENDANCE AS CSV
// ─────────────────────────────────────────────────────────────────

async function exportAttendanceCsv({ academyId, userId, role, teamId, from, to }) {
  let teamIds = [];

  if (teamId) {
    await assertTeamAccess({ teamId, userId, academyId, role });
    teamIds = [teamId];
  } else {
    if (role === 'Coach') {
      const { data: teams } = await supabaseAdmin
        .from('teams')
        .select('id')
        .eq('academy_id', academyId)
        .eq('coach_id', userId)
        .eq('is_active', true);
      teamIds = (teams || []).map(t => t.id);
    } else {
      const { data: teams } = await supabaseAdmin
        .from('teams')
        .select('id')
        .eq('academy_id', academyId)
        .eq('is_active', true);
      teamIds = (teams || []).map(t => t.id);
    }
  }

  if (teamIds.length === 0) return [];

  let eventsQuery = supabaseAdmin
    .from('events')
    .select('id, title, type, start_time, team_id, teams(name)')
    .eq('academy_id', academyId)
    .in('team_id', teamIds)
    .order('start_time', { ascending: false });

  if (from) eventsQuery = eventsQuery.gte('start_time', from);
  if (to)   eventsQuery = eventsQuery.lte('start_time', to);

  const { data: events, error: evtErr } = await eventsQuery;
  if (evtErr) throw new InternalError('Failed to fetch events for export.');
  if (!events || events.length === 0) return [];

  const eventIds = events.map(e => e.id);
  const eventMap = Object.fromEntries(events.map(e => [e.id, e]));

  const { data: rows, error: attErr } = await supabaseAdmin
    .from('attendance')
    .select(`
      event_id, status, notes,
      users!attendance_player_id_fkey (first_name, last_name, email)
    `)
    .eq('academy_id', academyId)
    .in('event_id', eventIds)
    .order('event_id');

  if (attErr) throw new InternalError('Failed to fetch attendance for export.');

  return (rows || []).map(r => ({
    player_name: `${r.users?.first_name ?? ''} ${r.users?.last_name ?? ''}`.trim(),
    email:       r.users?.email ?? '',
    team:        eventMap[r.event_id]?.teams?.name ?? '',
    event_title: eventMap[r.event_id]?.title ?? '',
    event_type:  eventMap[r.event_id]?.type ?? '',
    event_date:  eventMap[r.event_id]?.start_time
                   ? new Date(eventMap[r.event_id].start_time).toISOString().slice(0, 10)
                   : '',
    status:      r.status,
    notes:       r.notes ?? '',
  }));
}

module.exports = { getRosterWithAttendance, logAttendance, exportAttendanceCsv };
