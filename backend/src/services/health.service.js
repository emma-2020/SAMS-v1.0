// src/services/health.service.js
'use strict';

/**
 * HealthService
 * ─────────────
 * Manages daily player wellness check-in submissions and
 * the parent-facing health alert indicator reads.
 *
 * Rules:
 *   POST /api/health  → Player only. One submission per calendar day.
 *                       Scores must be integers 1–5.
 *                       DB trigger auto-sets is_flagged when thresholds breached.
 *
 *   GET  /api/health  → Player sees their own history.
 *                       Coach sees all players on their teams.
 *                       Parent sees their linked child's logs (flagged highlighted).
 *                       Admin sees all players in academy.
 */

const { supabaseAdmin } = require('../config/supabase');
const { ConflictError, ForbiddenError, NotFoundError } = require('../utils/errors');
const notif = require('./notifications.service');

// ─────────────────────────────────────────────────────────────────
// SUBMIT HEALTH LOG (Player)
// ─────────────────────────────────────────────────────────────────

/**
 * submitHealthLog
 * Inserts a new daily health check-in for the authenticated player.
 * Conflicts on (player_id, today's date) → 409 ConflictError.
 *
 * @param {object} options
 * @param {string} options.playerId
 * @param {string} options.academyId
 * @param {number} options.fatigue        1–5
 * @param {number} options.soreness       1–5
 * @param {number} options.sleep_quality  1–5
 * @param {string} [options.notes]
 */
async function submitHealthLog({ playerId, academyId, fatigue, soreness, sleep_quality, stress, notes }) {

  // Double-check caller is a Player (belt + braces beyond middleware)
  await assertPlayerRole(playerId, academyId);

  // Check for duplicate submission today
  const today = new Date().toISOString().slice(0, 10);   // YYYY-MM-DD

  const { data: existing } = await supabaseAdmin
    .from('health_logs')
    .select('id, logged_at')
    .eq('academy_id', academyId)              // tenant isolation
    .eq('player_id', playerId)
    .gte('logged_at', `${today}T00:00:00.000Z`)
    .lte('logged_at', `${today}T23:59:59.999Z`)
    .maybeSingle();

  if (existing) {
    throw new ConflictError(
      `You have already submitted a health log today (${today}). ` +
      `Log ID: ${existing.id}.`
    );
  }

  // Insert — DB trigger fn_health_flag_check sets is_flagged automatically
  const { data, error } = await supabaseAdmin
    .from('health_logs')
    .insert({
      academy_id:    academyId,               // tenant isolation on every insert
      player_id:     playerId,
      fatigue:       Number(fatigue),
      soreness:      Number(soreness),
      sleep_quality: Number(sleep_quality),
      stress:        stress != null ? Number(stress) : null,
      notes:         notes?.trim() || null,
    })
    .select('id, player_id, fatigue, soreness, sleep_quality, stress, is_flagged, notes, logged_at')
    .single();

  if (error) {
    console.error('[HealthService.submitHealthLog] insert:', error.message);
    throw new InternalError('Failed to save health log. Please try again.');
  }

  // Fire-and-forget: notify staff when a health log is flagged
  if (data.is_flagged) {
    const { data: player } = await supabaseAdmin
      .from('users')
      .select('first_name, last_name')
      .eq('id', playerId)
      .single();
    const name = player ? `${player.first_name} ${player.last_name}` : 'A player';
    notif.notifyStaff({
      academyId,
      type:  'health_flag',
      title: `Health Flag — ${name}`,
      body:  `Fatigue ${data.fatigue}/5, Soreness ${data.soreness}/5. Requires attention.`,
      link:  '/dashboard/coach/health',
    });
  }

  return data;
}

// ─────────────────────────────────────────────────────────────────
// GET HEALTH LOGS (role-scoped)
// ─────────────────────────────────────────────────────────────────

/**
 * getHealthLogs
 * Returns health log history scoped by role.
 *
 * @param {object} options
 * @param {string} options.userId
 * @param {string} options.academyId
 * @param {string} options.role
 * @param {string} [options.targetPlayerId]  explicit player filter (Coach/Admin)
 * @param {number} [options.days]            how many days back (default 30)
 */
async function getHealthLogs({ userId, academyId, role, targetPlayerId, days = 30 }) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  let playerIds;

  if (role === 'Player') {
    // Players only ever see their own logs
    playerIds = [userId];

  } else if (role === 'Parent') {
    playerIds = await getChildIds(userId, academyId);
    if (playerIds.length === 0) return [];

  } else if (role === 'Coach') {
    playerIds = await getCoachPlayerIds(userId, academyId);
    if (targetPlayerId) {
      if (!playerIds.includes(targetPlayerId)) {
        throw new ForbiddenError('That player is not on any of your teams.');
      }
      playerIds = [targetPlayerId];
    }

  } else if (role === 'Admin') {
    // Admin can target a specific player or get all
    playerIds = targetPlayerId ? [targetPlayerId] : null;   // null = no IN filter
  }

  let query = supabaseAdmin
    .from('health_logs')
    .select(`
      id,
      player_id,
      fatigue,
      soreness,
      sleep_quality,
      stress,
      is_flagged,
      notes,
      logged_at,
      users!health_logs_player_id_fkey ( id, first_name, last_name )
    `)
    .eq('academy_id', academyId)              // tenant isolation
    .gte('logged_at', since.toISOString())
    .order('logged_at', { ascending: false });

  if (playerIds !== null) {
    query = query.in('player_id', playerIds);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[HealthService.getHealthLogs] fetch:', error.message);
    throw new InternalError('Failed to fetch health logs. Please try again.');
  }

  return data;
}

// ─────────────────────────────────────────────────────────────────
// GET ACTIVE ALERTS (Parent + Coach)
// ─────────────────────────────────────────────────────────────────

/**
 * getActiveAlerts
 * Returns unresolved health flags for the caller's visible players.
 * Consumed by the Parent Portal health indicator widget.
 */
async function getActiveAlerts({ userId, academyId, role }) {
  let playerIds;

  if (role === 'Parent') {
    playerIds = await getChildIds(userId, academyId);
  } else if (role === 'Coach') {
    playerIds = await getCoachPlayerIds(userId, academyId);
  } else if (role === 'Admin') {
    playerIds = null;   // all players
  } else {
    throw new ForbiddenError('Players cannot access alert feeds.');
  }

  let query = supabaseAdmin
    .from('health_logs')
    .select(`
      id,
      player_id,
      fatigue,
      soreness,
      sleep_quality,
      stress,
      is_flagged,
      notes,
      logged_at,
      users!health_logs_player_id_fkey ( id, first_name, last_name )
    `)
    .eq('academy_id', academyId)              // tenant isolation
    .eq('is_flagged', true)
    .order('logged_at', { ascending: false })
    .limit(50);

  if (playerIds !== null) query = query.in('player_id', playerIds);

  const { data, error } = await query;
  if (error) {
    console.error('[HealthService.getActiveAlerts] fetch:', error.message);
    throw new InternalError('Failed to fetch alerts. Please try again.');
  }
  return data;
}

// ─────────────────────────────────────────────────────────────────
// INTERNAL HELPERS
// ─────────────────────────────────────────────────────────────────

async function assertPlayerRole(playerId, academyId) {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('role')
    .eq('id', playerId)
    .eq('academy_id', academyId)              // tenant isolation
    .single();

  if (error || !data) throw new NotFoundError('Player not found.');
  if (data.role !== 'Player') {
    throw new ForbiddenError('Only Players may submit health logs.');
  }
}

async function getChildIds(parentId, academyId) {
  const { data, error } = await supabaseAdmin
    .from('rosters')
    .select('player_id')
    .eq('academy_id', academyId)              // tenant isolation
    .eq('parent_id', parentId);

  if (error) {
    console.error('[HealthService.getChildIds] fetch:', error.message);
    throw new InternalError('Failed to resolve linked players. Please try again.');
  }
  return (data || []).map((r) => r.player_id);
}

async function getCoachPlayerIds(coachId, academyId) {
  // Get all teams the coach is assigned to
  const { data: teams } = await supabaseAdmin
    .from('teams')
    .select('id')
    .eq('academy_id', academyId)              // tenant isolation
    .eq('coach_id', coachId);

  if (!teams || teams.length === 0) return [];
  const teamIds = teams.map((t) => t.id);

  // Get all players on those teams
  const { data: rosters } = await supabaseAdmin
    .from('rosters')
    .select('player_id')
    .eq('academy_id', academyId)              // tenant isolation
    .in('team_id', teamIds);

  return [...new Set((rosters || []).map((r) => r.player_id))];
}

module.exports = { submitHealthLog, getHealthLogs, getActiveAlerts };
