// src/controllers/admin.controller.js
'use strict';

const adminService = require('../services/admin.service');

async function createInvitation(req, res, next) {
  try {
    const { email, role, first_name, last_name } = req.body;

    const invitation = await adminService.createInvitation({
      adminId:    req.user.id,
      academyId:  req.academyId,
      email,
      role,
      firstName:  first_name,
      lastName:   last_name,
    });

    return res.status(201).json({
      success: true,
      message: `Invitation sent to ${invitation.email}.`,
      data:    { invitation },
    });
  } catch (err) { next(err); }
}

async function listInvitations(req, res, next) {
  try {
    const { status } = req.query;
    const invitations = await adminService.listInvitations({
      academyId: req.academyId,
      status,
    });

    return res.status(200).json({
      success: true,
      count:   invitations.length,
      data:    { invitations },
    });
  } catch (err) { next(err); }
}

async function revokeInvitation(req, res, next) {
  try {
    const result = await adminService.revokeInvitation({
      invitationId: req.params.id,
      academyId:    req.academyId,
    });

    return res.status(200).json({
      success: true,
      message: `Invitation for ${result.email} revoked.`,
      data:    { invitation: result },
    });
  } catch (err) { next(err); }
}

async function listRoster(req, res, next) {
  try {
    const { supabaseAdmin } = require('../config/supabase');
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id, first_name, last_name, email, role, is_active, created_at')
      .eq('academy_id', req.academyId)
      .order('created_at', { ascending: false });
    if (error) throw new (require('../utils/errors').InternalError)('Failed to fetch roster.');
    return res.status(200).json({ success: true, data: { members: data || [] } });
  } catch (err) { next(err); }
}

async function getMemberDetail(req, res, next) {
  try {
    const { supabaseAdmin } = require('../config/supabase');
    const { NotFoundError }  = require('../utils/errors');
    const memberId  = req.params.id;
    const academyId = req.academyId;

    const { data: user, error: userErr } = await supabaseAdmin
      .from('users')
      .select('id, first_name, last_name, email, role, is_active, created_at, avatar_url')
      .eq('id', memberId)
      .eq('academy_id', academyId)
      .single();

    if (userErr || !user) throw new NotFoundError('Member not found.');

    const detail = { ...user };

    if (user.role === 'Player') {
      // Roster rows → team ids + parent id
      const { data: rosterRows } = await supabaseAdmin
        .from('rosters')
        .select('team_id, parent_id')
        .eq('player_id', memberId)
        .eq('academy_id', academyId);

      const teamIds  = [...new Set((rosterRows || []).map(r => r.team_id))];
      const parentId = (rosterRows || []).find(r => r.parent_id)?.parent_id ?? null;

      if (teamIds.length > 0) {
        const { data: teams } = await supabaseAdmin
          .from('teams')
          .select('id, name, sport, division, is_active')
          .in('id', teamIds);
        detail.teams = teams || [];
      } else {
        detail.teams = [];
      }

      if (parentId) {
        const { data: parent } = await supabaseAdmin
          .from('users')
          .select('id, first_name, last_name, email, is_active')
          .eq('id', parentId)
          .single();
        detail.parent = parent || null;
      } else {
        detail.parent = null;
      }

      const { data: healthLogs } = await supabaseAdmin
        .from('health_logs')
        .select('id, fatigue, soreness, sleep_quality, notes, log_date, logged_at, is_flagged')
        .eq('player_id', memberId)
        .eq('academy_id', academyId)
        .order('log_date', { ascending: false })
        .limit(5);

      detail.health_logs = healthLogs || [];

    } else if (user.role === 'Coach') {
      const { data: teams } = await supabaseAdmin
        .from('teams')
        .select('id, name, sport, division, is_active')
        .eq('coach_id', memberId)
        .eq('academy_id', academyId);

      const teamIds = (teams || []).map(t => t.id);
      const playerCounts = {};

      if (teamIds.length > 0) {
        const { data: rosterRows } = await supabaseAdmin
          .from('rosters')
          .select('team_id')
          .in('team_id', teamIds)
          .eq('academy_id', academyId);
        for (const r of (rosterRows || [])) {
          playerCounts[r.team_id] = (playerCounts[r.team_id] || 0) + 1;
        }
      }

      detail.teams = (teams || []).map(t => ({ ...t, player_count: playerCounts[t.id] ?? 0 }));

    } else if (user.role === 'Parent') {
      const { data: rosterRows } = await supabaseAdmin
        .from('rosters')
        .select('player_id, team_id')
        .eq('parent_id', memberId)
        .eq('academy_id', academyId);

      const playerIds = [...new Set((rosterRows || []).map(r => r.player_id))];
      const teamIds   = [...new Set((rosterRows || []).map(r => r.team_id))];

      const players = {}, teamMap = {};

      if (playerIds.length > 0) {
        const { data: playerData } = await supabaseAdmin
          .from('users')
          .select('id, first_name, last_name, email, is_active, avatar_url')
          .in('id', playerIds);
        for (const p of (playerData || [])) players[p.id] = p;
      }

      if (teamIds.length > 0) {
        const { data: teamData } = await supabaseAdmin
          .from('teams')
          .select('id, name, sport, division')
          .in('id', teamIds);
        for (const t of (teamData || [])) teamMap[t.id] = t;
      }

      const childrenMap = {};
      for (const r of (rosterRows || [])) {
        if (!childrenMap[r.player_id]) {
          childrenMap[r.player_id] = { player: players[r.player_id], teams: [] };
        }
        if (teamMap[r.team_id]) childrenMap[r.player_id].teams.push(teamMap[r.team_id]);
      }

      detail.children = Object.values(childrenMap);
    }

    return res.status(200).json({ success: true, data: { member: detail } });
  } catch (err) { next(err); }
}

async function setMemberStatus(req, res, next) {
  try {
    const member = await adminService.setMemberStatus({
      memberId:           req.params.id,
      academyId:          req.academyId,
      requestingAdminId:  req.user.id,
      isActive:           req.body.is_active,
    });
    const action = member.is_active ? 'reactivated' : 'deactivated';
    return res.status(200).json({
      success: true,
      message: `Member ${action} successfully.`,
      data:    { member },
    });
  } catch (err) { next(err); }
}

module.exports = { createInvitation, listInvitations, revokeInvitation, listRoster, getMemberDetail, setMemberStatus };
