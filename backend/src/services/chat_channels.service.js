// src/services/chat_channels.service.js
'use strict';

const { supabaseAdmin }      = require('../config/supabase');
const notif                  = require('./notifications.service');
const { resolveAttachmentUrl } = require('./chat.service');
const {
  ForbiddenError,
  NotFoundError,
  BadRequestError,
  InternalError,
} = require('../utils/errors');

// ─────────────────────────────────────────────────────────────────
// LIST CHANNELS
// Admin: sees all non-DM channels + own DMs.
// Others: only channels where they are a member.
// ─────────────────────────────────────────────────────────────────

async function listChannels({ userId, academyId, role }) {
  let channelIds;

  if (role === 'Admin') {
    // Admin sees all channels (including team/role/custom groups + their own DMs)
    const { data: all, error: allErr } = await supabaseAdmin
      .from('chat_channels')
      .select('id, type')
      .eq('academy_id', academyId);
    if (allErr) throw new InternalError('Failed to load channels.');

    // For DMs, only include ones the admin is a member of
    const directIds = all.filter(c => c.type === 'direct').map(c => c.id);
    let adminDirectIds = [];
    if (directIds.length > 0) {
      const { data: adminDMs } = await supabaseAdmin
        .from('chat_channel_members')
        .select('channel_id')
        .eq('user_id', userId)
        .in('channel_id', directIds);
      adminDirectIds = (adminDMs || []).map(m => m.channel_id);
    }

    const nonDirect = all.filter(c => c.type !== 'direct').map(c => c.id);
    channelIds = [...nonDirect, ...adminDirectIds];
  } else {
    const { data, error } = await supabaseAdmin
      .from('chat_channel_members')
      .select('channel_id')
      .eq('user_id', userId);
    if (error) throw new InternalError('Failed to load channels.');
    channelIds = (data || []).map(m => m.channel_id);
  }

  if (channelIds.length === 0) return [];

  // Fetch channel details
  const { data: channels, error: chErr } = await supabaseAdmin
    .from('chat_channels')
    .select('id, name, description, type, team_id, icon_color, created_by, created_at, updated_at')
    .eq('academy_id', academyId)
    .in('id', channelIds)
    .order('updated_at', { ascending: false });

  if (chErr || !channels) throw new InternalError('Failed to load channel details.');

  // Batch: member counts for all channels
  const { data: allMembers } = await supabaseAdmin
    .from('chat_channel_members')
    .select('channel_id')
    .in('channel_id', channelIds);

  const memberCounts = {};
  for (const m of (allMembers || [])) {
    memberCounts[m.channel_id] = (memberCounts[m.channel_id] || 0) + 1;
  }

  // Batch: latest message per channel (fetch recent messages and pick first per channel)
  const { data: recentMsgs } = await supabaseAdmin
    .from('messages')
    .select(`
      id, channel_id, message_text, sender_id, created_at,
      users!messages_sender_id_fkey ( first_name, last_name )
    `)
    .in('channel_id', channelIds)
    .order('created_at', { ascending: false })
    .limit(channelIds.length * 5);

  const lastMsgMap = {};
  for (const msg of (recentMsgs || [])) {
    if (!lastMsgMap[msg.channel_id]) lastMsgMap[msg.channel_id] = msg;
  }

  // Batch: other user for direct channels
  const dmChannelIds = channels.filter(c => c.type === 'direct').map(c => c.id);
  const otherUserMap = {};
  if (dmChannelIds.length > 0) {
    const { data: dmMembers } = await supabaseAdmin
      .from('chat_channel_members')
      .select(`
        channel_id,
        users!chat_channel_members_user_id_fkey ( id, first_name, last_name, role, avatar_url, last_seen_at )
      `)
      .in('channel_id', dmChannelIds)
      .neq('user_id', userId);

    for (const m of (dmMembers || [])) {
      if (m.users) otherUserMap[m.channel_id] = m.users;
    }
  }

  // Batch: mute state for current user
  const { data: muteRows } = await supabaseAdmin
    .from('chat_channel_members')
    .select('channel_id, is_muted, muted_until')
    .eq('user_id', userId)
    .in('channel_id', channelIds);

  const muteMap = {};
  for (const m of (muteRows || [])) {
    muteMap[m.channel_id] = { is_muted: m.is_muted, muted_until: m.muted_until };
  }

  return channels.map(ch => {
    const lastMsg  = lastMsgMap[ch.id] || null;
    const muteInfo = muteMap[ch.id] || { is_muted: false, muted_until: null };
    return {
      ...ch,
      is_muted:     muteInfo.is_muted,
      muted_until:  muteInfo.muted_until,
      member_count: memberCounts[ch.id] ?? 0,
      last_message: lastMsg
        ? {
            id:          lastMsg.id,
            body:        lastMsg.message_text,
            sender_name: lastMsg.users
              ? `${lastMsg.users.first_name} ${lastMsg.users.last_name}`
              : 'Someone',
            created_at: lastMsg.created_at,
          }
        : null,
      other_user: otherUserMap[ch.id] ?? null,
    };
  });
}

// ─────────────────────────────────────────────────────────────────
// GET CHANNEL MEMBERS
// ─────────────────────────────────────────────────────────────────

async function getChannelMembers({ channelId, academyId }) {
  await fetchChannelOrThrow(channelId, academyId);

  const { data, error } = await supabaseAdmin
    .from('chat_channel_members')
    .select(`
      user_id, is_admin, joined_at,
      users!chat_channel_members_user_id_fkey ( id, first_name, last_name, email, role )
    `)
    .eq('channel_id', channelId);

  if (error) throw new InternalError('Failed to load members.');

  return (data || []).map(m => ({
    user_id:   m.user_id,
    is_admin:  m.is_admin,
    joined_at: m.joined_at,
    ...(m.users || {}),
  }));
}

// ─────────────────────────────────────────────────────────────────
// CREATE GROUP
// Admin only — type must be role_group or custom_group.
// For role_group: auto-adds all users with the matching role.
// For custom_group: adds only the provided memberIds.
// ─────────────────────────────────────────────────────────────────

async function createGroup({ name, type, description, iconColor, memberIds, targetRole, createdBy, academyId }) {
  if (!name || !name.trim()) throw new BadRequestError('Group name is required.');
  if (!['role_group', 'custom_group'].includes(type)) {
    throw new BadRequestError('Group type must be "role_group" or "custom_group".');
  }

  let resolvedMemberIds = memberIds || [];

  if (type === 'role_group') {
    if (!targetRole || !['Coach', 'Player', 'Parent'].includes(targetRole)) {
      throw new BadRequestError('targetRole must be Coach, Player, or Parent for role_group.');
    }
    const { data: roleUsers } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('academy_id', academyId)
      .eq('role', targetRole)
      .eq('is_active', true);
    resolvedMemberIds = (roleUsers || []).map(u => u.id);
  }

  // Insert channel
  const { data: channel, error: chErr } = await supabaseAdmin
    .from('chat_channels')
    .insert({
      academy_id:  academyId,
      name:        name.trim(),
      description: description?.trim() || null,
      type,
      icon_color:  iconColor || null,
      created_by:  createdBy,
    })
    .select()
    .single();

  if (chErr) {
    console.error('[ChatChannels.createGroup]', chErr.message);
    throw new InternalError('Failed to create group.');
  }

  const allIds = [...new Set([createdBy, ...resolvedMemberIds])];
  const rows   = allIds.map(uid => ({
    channel_id: channel.id,
    user_id:    uid,
    is_admin:   uid === createdBy,
  }));

  if (rows.length > 0) {
    const { error: memErr } = await supabaseAdmin
      .from('chat_channel_members')
      .insert(rows);
    if (memErr) console.error('[ChatChannels.createGroup] member insert:', memErr.message);
  }

  return { ...channel, member_count: allIds.length };
}

// ─────────────────────────────────────────────────────────────────
// UPDATE GROUP
// Admin only. Cannot rename team channels or direct channels.
// ─────────────────────────────────────────────────────────────────

async function updateGroup({ channelId, name, description, iconColor, academyId }) {
  const channel = await fetchChannelOrThrow(channelId, academyId);
  if (channel.type === 'direct') throw new ForbiddenError('Cannot edit direct message channels.');

  const updates = {};
  if (name        !== undefined) updates.name        = name.trim();
  if (description !== undefined) updates.description = description?.trim() || null;
  if (iconColor   !== undefined) updates.icon_color  = iconColor;

  const { data, error } = await supabaseAdmin
    .from('chat_channels')
    .update(updates)
    .eq('id', channelId)
    .eq('academy_id', academyId)
    .select()
    .single();

  if (error) throw new InternalError('Failed to update group.');
  return data;
}

// ─────────────────────────────────────────────────────────────────
// DELETE GROUP
// Admin only. Cannot delete team channels (delete the team instead).
// ─────────────────────────────────────────────────────────────────

async function deleteGroup({ channelId, academyId }) {
  const channel = await fetchChannelOrThrow(channelId, academyId);
  if (channel.type === 'team') {
    throw new ForbiddenError('Team channels cannot be deleted here. Delete the team instead.');
  }

  const { error } = await supabaseAdmin
    .from('chat_channels')
    .delete()
    .eq('id', channelId)
    .eq('academy_id', academyId);

  if (error) throw new InternalError('Failed to delete group.');
  return { deleted: true };
}

// ─────────────────────────────────────────────────────────────────
// ADD MEMBER
// Admin only.
// ─────────────────────────────────────────────────────────────────

async function addMember({ channelId, userId, academyId }) {
  const channel = await fetchChannelOrThrow(channelId, academyId);
  if (channel.type === 'direct') throw new ForbiddenError('Cannot add members to direct messages.');

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('id', userId)
    .eq('academy_id', academyId)
    .single();
  if (!user) throw new NotFoundError('User not found in this academy.');

  const { error } = await supabaseAdmin
    .from('chat_channel_members')
    .upsert(
      { channel_id: channelId, user_id: userId, is_admin: false },
      { onConflict: 'channel_id,user_id' },
    );

  if (error) throw new InternalError('Failed to add member.');
  return { added: true };
}

// ─────────────────────────────────────────────────────────────────
// REMOVE MEMBER
// Admin only.
// ─────────────────────────────────────────────────────────────────

async function removeMember({ channelId, userId, academyId }) {
  const channel = await fetchChannelOrThrow(channelId, academyId);
  if (channel.type === 'direct') throw new ForbiddenError('Cannot remove members from direct messages.');

  const { error } = await supabaseAdmin
    .from('chat_channel_members')
    .delete()
    .eq('channel_id', channelId)
    .eq('user_id', userId);

  if (error) throw new InternalError('Failed to remove member.');
  return { removed: true };
}

// ─────────────────────────────────────────────────────────────────
// GET OR CREATE DIRECT CHANNEL
// Finds an existing 1:1 DM between two users or creates one.
// ─────────────────────────────────────────────────────────────────

async function getOrCreateDirect({ userId, userRole, targetUserId, academyId }) {
  if (userId === targetUserId) throw new BadRequestError('Cannot message yourself.');

  const { data: targetUser } = await supabaseAdmin
    .from('users')
    .select('id, first_name, last_name, role')
    .eq('id', targetUserId)
    .eq('academy_id', academyId)
    .single();
  if (!targetUser) throw new NotFoundError('User not found in this academy.');

  // Check per-academy Coach <-> Player DM policy
  if (
    (userRole === 'Coach' && targetUser.role === 'Player') ||
    (userRole === 'Player' && targetUser.role === 'Coach')
  ) {
    const { data: academy } = await supabaseAdmin
      .from('academies')
      .select('settings')
      .eq('id', academyId)
      .single();
    const allowed = academy?.settings?.chat_coach_player_dm === true;
    if (!allowed) {
      throw new ForbiddenError(
        'Direct messages between coaches and players are disabled by your academy. An admin can enable this in Chat Policy settings.',
      );
    }
  }

  // Check if either user has blocked the other
  const { data: blockRecord } = await supabaseAdmin
    .from('blocked_users')
    .select('blocker_id')
    .or(`and(blocker_id.eq.${userId},blocked_id.eq.${targetUserId}),and(blocker_id.eq.${targetUserId},blocked_id.eq.${userId})`)
    .eq('academy_id', academyId)
    .limit(1)
    .maybeSingle();
  if (blockRecord) throw new ForbiddenError('You cannot message this user.');

  // Find channels the current user belongs to
  const { data: myMemberships } = await supabaseAdmin
    .from('chat_channel_members')
    .select('channel_id')
    .eq('user_id', userId);

  const myChannelIds = (myMemberships || []).map(m => m.channel_id);

  if (myChannelIds.length > 0) {
    // Find direct channels among them where the target is also a member
    const { data: directChannels } = await supabaseAdmin
      .from('chat_channels')
      .select('id')
      .eq('academy_id', academyId)
      .eq('type', 'direct')
      .in('id', myChannelIds);

    const directIds = (directChannels || []).map(c => c.id);
    if (directIds.length > 0) {
      const { data: match } = await supabaseAdmin
        .from('chat_channel_members')
        .select('channel_id')
        .eq('user_id', targetUserId)
        .in('channel_id', directIds)
        .limit(1)
        .single();

      if (match) {
        // Return existing DM channel
        const { data: ch } = await supabaseAdmin
          .from('chat_channels')
          .select('id, name, type')
          .eq('id', match.channel_id)
          .single();
        return ch;
      }
    }
  }

  // Create new DM channel
  const { data: currentUser } = await supabaseAdmin
    .from('users')
    .select('first_name, last_name')
    .eq('id', userId)
    .single();

  const { data: channel, error: chErr } = await supabaseAdmin
    .from('chat_channels')
    .insert({
      academy_id: academyId,
      name:       `${currentUser?.first_name ?? 'Me'} & ${targetUser.first_name}`,
      type:       'direct',
      created_by: userId,
    })
    .select()
    .single();

  if (chErr) throw new InternalError('Failed to create direct message channel.');

  await supabaseAdmin
    .from('chat_channel_members')
    .insert([
      { channel_id: channel.id, user_id: userId,       is_admin: false },
      { channel_id: channel.id, user_id: targetUserId, is_admin: false },
    ]);

  return channel;
}

// ─────────────────────────────────────────────────────────────────
// SEARCH USERS
// Used for selecting DM recipients or custom group members.
// ─────────────────────────────────────────────────────────────────

async function searchUsers({ query, academyId, currentUserId }) {
  // Fetch IDs of users blocked by the current user (exclude from results)
  const { data: blockedRows } = await supabaseAdmin
    .from('blocked_users')
    .select('blocked_id')
    .eq('blocker_id', currentUserId);
  const blockedIds = (blockedRows || []).map(r => r.blocked_id);

  // Fetch academy DM policy so the frontend can show locks on restricted role pairs
  const { data: academy } = await supabaseAdmin
    .from('academies')
    .select('settings')
    .eq('id', academyId)
    .single();
  const academy_allows_coach_player_dm = academy?.settings?.chat_coach_player_dm === true;

  let q = supabaseAdmin
    .from('users')
    .select('id, first_name, last_name, email, role')
    .eq('academy_id', academyId)
    .eq('is_active', true)
    .neq('id', currentUserId)
    .limit(20);

  if (blockedIds.length > 0) q = q.not('id', 'in', `(${blockedIds.join(',')})`);

  if (query && query.trim()) {
    const s = query.trim();
    q = q.or(`first_name.ilike.%${s}%,last_name.ilike.%${s}%,email.ilike.%${s}%`);
  }

  const { data, error } = await q.order('first_name');
  if (error) throw new InternalError('Search failed.');
  return { users: data || [], academy_allows_coach_player_dm };
}

// ─────────────────────────────────────────────────────────────────
// LEAVE CHANNEL
// Any member can leave a non-team channel.
// If the leaver is the last admin and others remain, the next member
// is promoted to admin to avoid admin-less groups.
// ─────────────────────────────────────────────────────────────────

async function leaveChannel({ channelId, userId, academyId }) {
  const channel = await fetchChannelOrThrow(channelId, academyId);
  if (channel.type === 'team') throw new ForbiddenError('You cannot leave team channels.');
  if (channel.type === 'direct') throw new ForbiddenError('You cannot leave direct messages.');

  const { data: membership } = await supabaseAdmin
    .from('chat_channel_members')
    .select('is_admin')
    .eq('channel_id', channelId)
    .eq('user_id', userId)
    .single();
  if (!membership) throw new ForbiddenError('You are not a member of this channel.');

  if (membership.is_admin) {
    const { data: otherAdmins } = await supabaseAdmin
      .from('chat_channel_members')
      .select('user_id')
      .eq('channel_id', channelId)
      .eq('is_admin', true)
      .neq('user_id', userId);

    if (!otherAdmins || otherAdmins.length === 0) {
      // Promote the next available non-admin member
      const { data: others } = await supabaseAdmin
        .from('chat_channel_members')
        .select('user_id')
        .eq('channel_id', channelId)
        .neq('user_id', userId)
        .limit(1);

      if (others && others.length > 0) {
        await supabaseAdmin
          .from('chat_channel_members')
          .update({ is_admin: true })
          .eq('channel_id', channelId)
          .eq('user_id', others[0].user_id);
      }
    }
  }

  await supabaseAdmin
    .from('chat_channel_members')
    .delete()
    .eq('channel_id', channelId)
    .eq('user_id', userId);

  return { left: true };
}

// ─────────────────────────────────────────────────────────────────
// MUTE / UNMUTE CHANNEL
// Per-member mute. muted_until=null means muted forever.
// ─────────────────────────────────────────────────────────────────

async function muteChannel({ channelId, userId, mutedUntil }) {
  const { error } = await supabaseAdmin
    .from('chat_channel_members')
    .update({ is_muted: true, muted_until: mutedUntil || null })
    .eq('channel_id', channelId)
    .eq('user_id', userId);
  if (error) throw new InternalError('Failed to mute channel.');
  return { muted: true };
}

async function unmuteChannel({ channelId, userId }) {
  const { error } = await supabaseAdmin
    .from('chat_channel_members')
    .update({ is_muted: false, muted_until: null })
    .eq('channel_id', channelId)
    .eq('user_id', userId);
  if (error) throw new InternalError('Failed to unmute channel.');
  return { muted: false };
}

// ─────────────────────────────────────────────────────────────────
// BLOCK / UNBLOCK USER
// ─────────────────────────────────────────────────────────────────

async function blockUser({ blockerId, blockedId, academyId }) {
  if (blockerId === blockedId) throw new BadRequestError('Cannot block yourself.');
  const { error } = await supabaseAdmin
    .from('blocked_users')
    .upsert(
      { blocker_id: blockerId, blocked_id: blockedId, academy_id: academyId },
      { onConflict: 'blocker_id,blocked_id' },
    );
  if (error) throw new InternalError('Failed to block user.');
  return { blocked: true };
}

async function unblockUser({ blockerId, blockedId }) {
  const { error } = await supabaseAdmin
    .from('blocked_users')
    .delete()
    .eq('blocker_id', blockerId)
    .eq('blocked_id', blockedId);
  if (error) throw new InternalError('Failed to unblock user.');
  return { blocked: false };
}

async function getBlockedUsers({ userId, academyId }) {
  const { data, error } = await supabaseAdmin
    .from('blocked_users')
    .select(`
      blocked_id, created_at,
      users!blocked_users_blocked_id_fkey ( id, first_name, last_name, role, email )
    `)
    .eq('blocker_id', userId)
    .eq('academy_id', academyId)
    .order('created_at', { ascending: false });

  if (error) throw new InternalError('Failed to fetch blocked users.');
  return (data || []).map(r => ({ ...r.users, blocked_at: r.created_at }));
}

// ─────────────────────────────────────────────────────────────────
// REPORT MESSAGE
// ─────────────────────────────────────────────────────────────────

async function reportMessage({ messageId, reportedBy, reason, notes, academyId }) {
  const { data: msg } = await supabaseAdmin
    .from('messages')
    .select('id, sender_id, message_text, channel_id')
    .eq('id', messageId)
    .eq('academy_id', academyId)
    .single();
  if (!msg) throw new NotFoundError('Message not found.');

  const { data: report, error } = await supabaseAdmin
    .from('reported_messages')
    .insert({
      academy_id:  academyId,
      message_id:  messageId,
      reported_by: reportedBy,
      reason,
      notes: notes || null,
    })
    .select()
    .single();

  if (error) throw new InternalError('Failed to submit report.');

  // Notify admins (fire-and-forget)
  notif.notifyStaff({
    academyId,
    type:  'report',
    title: 'New message report',
    body:  `A message was reported: "${reason}"`,
    link:  '/dashboard/admin/chat',
  }).catch(() => {});

  return report;
}

// ─────────────────────────────────────────────────────────────────
// GET REPORTS  (Admin only)
// ─────────────────────────────────────────────────────────────────

async function getReports({ academyId }) {
  const { data, error } = await supabaseAdmin
    .from('reported_messages')
    .select(`
      id, reason, notes, status, created_at, reviewed_at,
      messages!reported_messages_message_id_fkey (
        id, message_text, attachment_url, created_at,
        users!messages_sender_id_fkey ( id, first_name, last_name, role )
      ),
      reporter:users!reported_messages_reported_by_fkey ( id, first_name, last_name, role ),
      reviewer:users!reported_messages_reviewed_by_fkey ( id, first_name, last_name )
    `)
    .eq('academy_id', academyId)
    .order('created_at', { ascending: false });

  if (error) throw new InternalError('Failed to fetch reports.');

  return Promise.all((data || []).map(async (report) => (
    report.messages?.attachment_url
      ? { ...report, messages: { ...report.messages, attachment_url: await resolveAttachmentUrl(report.messages.attachment_url) } }
      : report
  )));
}

// ─────────────────────────────────────────────────────────────────
// REVIEW REPORT  (Admin only)
// ─────────────────────────────────────────────────────────────────

async function reviewReport({ reportId, reviewedBy, status, academyId }) {
  if (!['reviewed', 'dismissed'].includes(status)) {
    throw new BadRequestError('Status must be "reviewed" or "dismissed".');
  }

  const { data, error } = await supabaseAdmin
    .from('reported_messages')
    .update({ status, reviewed_by: reviewedBy, reviewed_at: new Date().toISOString() })
    .eq('id', reportId)
    .eq('academy_id', academyId)
    .select()
    .single();

  if (error || !data) throw new NotFoundError('Report not found.');
  return data;
}

// ─────────────────────────────────────────────────────────────────
// ACADEMY SETTINGS
// ─────────────────────────────────────────────────────────────────

async function getAcademySettings({ academyId }) {
  const { data, error } = await supabaseAdmin
    .from('academies')
    .select('settings')
    .eq('id', academyId)
    .single();
  if (error || !data) throw new NotFoundError('Academy not found.');
  return data.settings || {};
}

async function updateAcademySettings({ academyId, settings }) {
  // Merge incoming settings with existing to avoid clobbering other keys
  const { data: existing } = await supabaseAdmin
    .from('academies')
    .select('settings')
    .eq('id', academyId)
    .single();

  const merged = { ...(existing?.settings || {}), ...settings };

  const { data, error } = await supabaseAdmin
    .from('academies')
    .update({ settings: merged })
    .eq('id', academyId)
    .select('settings')
    .single();

  if (error) throw new InternalError('Failed to update settings.');
  return data.settings;
}

// ─────────────────────────────────────────────────────────────────
// INTERNAL HELPERS
// ─────────────────────────────────────────────────────────────────

async function fetchChannelOrThrow(channelId, academyId) {
  const { data, error } = await supabaseAdmin
    .from('chat_channels')
    .select('id, name, type, team_id, academy_id')
    .eq('id', channelId)
    .eq('academy_id', academyId)
    .single();

  if (error || !data) throw new NotFoundError('Channel not found.');
  return data;
}

module.exports = {
  listChannels,
  getChannelMembers,
  createGroup,
  updateGroup,
  deleteGroup,
  addMember,
  removeMember,
  getOrCreateDirect,
  searchUsers,
  leaveChannel,
  muteChannel,
  unmuteChannel,
  blockUser,
  unblockUser,
  getBlockedUsers,
  reportMessage,
  getReports,
  reviewReport,
  getAcademySettings,
  updateAcademySettings,
};
