// src/routes/teams.routes.js
'use strict';

/**
 * Teams Routes
 *
 * GET  /api/teams         — list teams the user can access
 * POST /api/teams         — create a team (Admin only)
 * GET  /api/teams/:id/members — list members of a team
 */

const { Router } = require('express');
const { authenticate, extractTenant, requireRole } = require('../middleware/auth.middleware');
const { supabaseAdmin } = require('../config/supabase');
const { NotFoundError, InternalError } = require('../utils/errors');

const router = Router();
router.use(authenticate, extractTenant);

// GET /api/teams — returns teams accessible to the requesting user
router.get('/', async (req, res, next) => {
  try {
    const { id: userId, academy_id: academyId, role } = req.user;

    let query = supabaseAdmin
      .from('teams')
      .select(`id, name, division, sport, is_active, coach_id,
        users!teams_coach_id_fkey ( id, first_name, last_name, email )
      `)
      .eq('academy_id', academyId)
      .eq('is_active', true)
      .order('name');

    // Coaches only see their own teams
    if (role === 'Coach') query = query.eq('coach_id', userId);

    // Players see teams they're rostered on
    if (role === 'Player') {
      const { data: rosters } = await supabaseAdmin
        .from('rosters').select('team_id')
        .eq('academy_id', academyId).eq('player_id', userId);
      const teamIds = (rosters || []).map(r => r.team_id);
      if (!teamIds.length) return res.json({ success: true, data: { teams: [] } });
      query = query.in('id', teamIds);
    }

    // Parents see teams their children are on
    if (role === 'Parent') {
      const { data: links } = await supabaseAdmin
        .from('rosters').select('player_id')
        .eq('academy_id', academyId).eq('parent_id', userId);
      const childIds = (links || []).map(l => l.player_id);
      if (!childIds.length) return res.json({ success: true, data: { teams: [] } });
      const { data: childRosters } = await supabaseAdmin
        .from('rosters').select('team_id')
        .eq('academy_id', academyId).in('player_id', childIds);
      const teamIds = [...new Set((childRosters || []).map(r => r.team_id))];
      if (!teamIds.length) return res.json({ success: true, data: { teams: [] } });
      query = query.in('id', teamIds);
    }

    const { data, error } = await query;
    if (error) throw new InternalError('Failed to fetch teams.');

    return res.json({ success: true, data: { teams: data || [] } });
  } catch (err) { next(err); }
});

// POST /api/teams — Admin only
router.post('/', requireRole('Admin'), async (req, res, next) => {
  try {
    const { name, sport, division, coach_id } = req.body;
    if (!name?.trim()) return res.status(400).json({ success: false, error: 'Team name required.' });

    const { data, error } = await supabaseAdmin
      .from('teams')
      .insert({
        academy_id: req.academyId,
        name:       name.trim(),
        sport:      sport?.trim() || null,
        division:   division?.trim() || null,
        coach_id:   coach_id || null,
        is_active:  true,
      })
      .select(`id, name, division, sport, is_active, coach_id,
        users!teams_coach_id_fkey ( id, first_name, last_name )
      `)
      .single();

    if (error) throw new InternalError('Failed to create team.');
    return res.status(201).json({ success: true, data: { team: data } });
  } catch (err) { next(err); }
});

// DELETE /api/teams/:id — Admin only
router.delete('/:id', requireRole('Admin'), async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('teams')
      .update({ is_active: false })
      .eq('id', req.params.id)
      .eq('academy_id', req.academyId)
      .select('id, name')
      .single();
    if (error || !data) throw new NotFoundError('Team not found.');
    return res.json({ success: true, message: `Team "${data.name}" deactivated.` });
  } catch (err) { next(err); }
});

// GET /api/teams/:id/members
router.get('/:id/members', async (req, res, next) => {
  try {
    const { data: team } = await supabaseAdmin
      .from('teams').select('id, name')
      .eq('id', req.params.id).eq('academy_id', req.academyId).single();
    if (!team) throw new NotFoundError('Team not found.');

    const { data: rosters } = await supabaseAdmin
      .from('rosters')
      .select(`player_id, parent_id,
        players:users!rosters_player_id_fkey ( id, first_name, last_name, email ),
        parents:users!rosters_parent_id_fkey ( id, first_name, last_name, email )
      `)
      .eq('team_id', req.params.id)
      .eq('academy_id', req.academyId);

    return res.json({ success: true, data: { team, rosters: rosters || [] } });
  } catch (err) { next(err); }
});

// POST /api/teams/:id/members — Admin only (add player to team)
router.post('/:id/members', requireRole('Admin'), async (req, res, next) => {
  try {
    const { player_id, parent_id } = req.body;
    if (!player_id) return res.status(400).json({ success: false, error: 'player_id required.' });

    const { data, error } = await supabaseAdmin
      .from('rosters')
      .upsert({
        academy_id: req.academyId,
        team_id:    req.params.id,
        player_id,
        parent_id:  parent_id || null,
      }, { onConflict: 'team_id,player_id' })
      .select('*')
      .single();

    if (error) throw new InternalError('Failed to add member.');
    return res.status(201).json({ success: true, data: { roster: data } });
  } catch (err) { next(err); }
});

module.exports = router;
