'use strict';

/**
 * Coach Routes  /api/coach
 *
 * GET  /api/coach/players           — all players across coach's assigned teams
 * GET  /api/coach/players/:id/profile — full player profile (health + workouts + upcoming events)
 *
 * Both routes require Admin or Coach role.
 * Coaches only see players on teams where they are the assigned coach_id.
 */

const { Router }    = require('express');
const { authenticate, extractTenant, requireRole } = require('../middleware/auth.middleware');
const { supabaseAdmin } = require('../config/supabase');
const { InternalError, NotFoundError, ForbiddenError } = require('../utils/errors');

const router = Router();
router.use(authenticate, extractTenant, requireRole('Admin', 'Coach'));

// ─── Resolve team IDs the caller may access ────────────────────────
async function resolveCoachTeams({ userId, academyId, role }) {
  let query = supabaseAdmin
    .from('teams')
    .select('id, name, sport, division')
    .eq('academy_id', academyId)
    .eq('is_active', true)
    .order('name');

  if (role === 'Coach') query = query.eq('coach_id', userId);

  const { data, error } = await query;
  if (error) throw new InternalError('Failed to fetch teams.');
  return data || [];
}

// ─── GET /api/coach/players ────────────────────────────────────────
router.get('/players', async (req, res, next) => {
  try {
    const { id: userId, academy_id: academyId, role } = req.user;
    const teams = await resolveCoachTeams({ userId, academyId, role });

    if (teams.length === 0) {
      return res.json({ success: true, data: { players: [], teams: [] } });
    }

    const teamIds = teams.map(t => t.id);
    const teamMap = Object.fromEntries(teams.map(t => [t.id, t]));

    const { data: rosters, error: rosterError } = await supabaseAdmin
      .from('rosters')
      .select(`
        team_id, player_id,
        players:users!rosters_player_id_fkey (
          id, first_name, last_name, email, avatar_url, is_active, created_at
        )
      `)
      .eq('academy_id', academyId)
      .in('team_id', teamIds);

    if (rosterError) throw new InternalError('Failed to fetch players.');

    // Deduplicate players; accumulate team list per player
    const playerMap = {};
    for (const entry of (rosters || [])) {
      const p = entry.players;
      if (!p?.id) continue;
      if (!playerMap[p.id]) playerMap[p.id] = { ...p, teams: [] };
      playerMap[p.id].teams.push({
        id:    entry.team_id,
        name:  teamMap[entry.team_id]?.name,
        sport: teamMap[entry.team_id]?.sport,
      });
    }

    // Attach most-recent health log per player (one DB call, not N)
    const playerIds = Object.keys(playerMap);
    if (playerIds.length > 0) {
      const { data: healthLogs } = await supabaseAdmin
        .from('health_logs')
        .select('player_id, fatigue, soreness, sleep_quality, is_flagged, logged_at')
        .eq('academy_id', academyId)
        .in('player_id', playerIds)
        .order('logged_at', { ascending: false });

      const seen = new Set();
      for (const log of (healthLogs || [])) {
        if (seen.has(log.player_id)) continue;
        seen.add(log.player_id);
        if (playerMap[log.player_id]) {
          playerMap[log.player_id].latest_health = {
            fatigue:       log.fatigue,
            soreness:      log.soreness,
            sleep_quality: log.sleep_quality,
            is_flagged:    log.is_flagged,
            logged_at:     log.logged_at,
          };
        }
      }
    }

    return res.json({
      success: true,
      data: { players: Object.values(playerMap), teams },
    });
  } catch (err) { next(err); }
});

// ─── GET /api/coach/players/:id/profile ───────────────────────────
router.get('/players/:id/profile', async (req, res, next) => {
  try {
    const { id: userId, academy_id: academyId, role } = req.user;
    const playerId = req.params.id;

    const teams   = await resolveCoachTeams({ userId, academyId, role });
    const teamIds = teams.map(t => t.id);

    if (teamIds.length === 0) throw new ForbiddenError('No teams assigned.');

    // Confirm player is on one of coach's teams
    const { data: rosterCheck } = await supabaseAdmin
      .from('rosters')
      .select('player_id')
      .eq('academy_id', academyId)
      .eq('player_id', playerId)
      .in('team_id', teamIds)
      .limit(1);

    if (!rosterCheck?.length) {
      throw new NotFoundError('Player not found or not on your teams.');
    }

    // Parallel fetch: player profile + last 30 health logs + recent workouts + upcoming events
    const [playerRes, healthRes, workoutsRes, eventsRes] = await Promise.all([
      supabaseAdmin.from('users')
        .select('id, first_name, last_name, email, avatar_url, is_active, created_at')
        .eq('id', playerId)
        .eq('academy_id', academyId)
        .single(),

      supabaseAdmin.from('health_logs')
        .select('id, fatigue, soreness, sleep_quality, notes, is_flagged, logged_at')
        .eq('academy_id', academyId)
        .eq('player_id', playerId)
        .order('logged_at', { ascending: false })
        .limit(30),

      supabaseAdmin.from('workout_assignments')
        .select(`
          id, title, due_date, created_at, team_id, player_id,
          workout_exercises ( id, sort_order, description, sets_reps_notes )
        `)
        .eq('academy_id', academyId)
        .or(`player_id.eq.${playerId},team_id.in.(${teamIds.join(',')})`)
        .order('created_at', { ascending: false })
        .limit(10),

      supabaseAdmin.from('events')
        .select('id, title, type, location, start_time, end_time, teams(id, name)')
        .eq('academy_id', academyId)
        .in('team_id', teamIds)
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true })
        .limit(6),
    ]);

    if (playerRes.error || !playerRes.data) throw new NotFoundError('Player not found.');

    return res.json({
      success: true,
      data: {
        player:         playerRes.data,
        healthLogs:     healthRes.data    || [],
        workouts:       workoutsRes.data  || [],
        upcomingEvents: eventsRes.data    || [],
      },
    });
  } catch (err) { next(err); }
});

module.exports = router;
