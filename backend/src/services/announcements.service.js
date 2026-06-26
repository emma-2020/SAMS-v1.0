'use strict';

const { supabaseAdmin } = require('../config/supabase');
const { NotFoundError, InternalError } = require('../utils/errors');

const ROLE_TO_AUDIENCE = { Coach: 'coaches', Player: 'players', Parent: 'parents' };
const AUDIENCE_TO_ROLES = {
  everyone: ['Admin', 'Coach', 'Player', 'Parent'],
  players:  ['Player'],
  coaches:  ['Coach'],
  parents:  ['Parent'],
};

async function listAnnouncements({ academyId, userRole }) {
  let query = supabaseAdmin
    .from('announcements')
    .select(`
      id, title, body, audience, created_at,
      author:users!announcements_created_by_fkey (id, first_name, last_name)
    `)
    .eq('academy_id', academyId)
    .order('created_at', { ascending: false });

  if (userRole !== 'Admin') {
    // Only show announcements from the last 24 hours to end users
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    query = query.gte('created_at', cutoff);

    // Filter by audience: show 'everyone' + role-specific ones
    const audienceKey = ROLE_TO_AUDIENCE[userRole];
    if (audienceKey) {
      query = query.in('audience', ['everyone', audienceKey]);
    }
  }

  const { data, error } = await query.limit(50);
  if (error) throw new InternalError('Failed to fetch announcements.');
  return data || [];
}

async function createAnnouncement({ academyId, adminId, title, body, audience = 'everyone' }) {
  const { data, error } = await supabaseAdmin
    .from('announcements')
    .insert({
      academy_id: academyId,
      created_by: adminId,
      title:      title.trim(),
      body:       body.trim(),
      audience,
    })
    .select(`
      id, title, body, audience, created_at,
      author:users!announcements_created_by_fkey (id, first_name, last_name)
    `)
    .single();

  if (error) throw new InternalError('Failed to create announcement.');

  // Fire-and-forget: send in-app notifications + emails to the target audience
  _dispatchNotificationsAndEmails({ academyId, announcement: data }).catch(err =>
    console.error('[announcements] dispatch error:', err.message)
  );

  return data;
}

async function _dispatchNotificationsAndEmails({ academyId, announcement }) {
  const notifSvc = require('./notifications.service');
  const emailSvc = require('./email.service');

  const targetRoles = AUDIENCE_TO_ROLES[announcement.audience] || AUDIENCE_TO_ROLES.everyone;

  // Fetch all active users in the target audience
  const { data: users, error } = await supabaseAdmin
    .from('users')
    .select('id, email, first_name, preferences')
    .eq('academy_id', academyId)
    .eq('is_active', true)
    .in('role', targetRoles);

  if (error || !users?.length) return;

  // In-app notifications for everyone in the audience
  await notifSvc.createForMany({
    academyId,
    recipientIds: users.map(u => u.id),
    type:  'announcement',
    title: announcement.title,
    body:  announcement.body,
    link:  null,
  });

  // Email: respect user's team_announcements preference (default = on)
  const { data: academy } = await supabaseAdmin
    .from('academies')
    .select('name')
    .eq('id', academyId)
    .single();

  const academyName = academy?.name || 'Your Academy';

  for (const user of users) {
    const prefs = user.preferences || {};
    const notifPrefs = prefs.notifications || {};
    if (notifPrefs.team_announcements === false) continue;

    emailSvc.sendAnnouncementEmail({
      to:          user.email,
      firstName:   user.first_name || 'Member',
      academyName,
      title:       announcement.title,
      body:        announcement.body,
      audience:    announcement.audience,
      dashboardUrl: 'https://playsams.com/dashboard',
    }).catch(err => console.error(`[announcements] email error (${user.email}):`, err.message));
  }
}

async function deleteAnnouncement({ academyId, announcementId }) {
  const { data: existing } = await supabaseAdmin
    .from('announcements')
    .select('id')
    .eq('id', announcementId)
    .eq('academy_id', academyId)
    .single();

  if (!existing) throw new NotFoundError('Announcement not found.');

  const { error } = await supabaseAdmin
    .from('announcements')
    .delete()
    .eq('id', announcementId)
    .eq('academy_id', academyId);

  if (error) throw new InternalError('Failed to delete announcement.');
}

module.exports = { listAnnouncements, createAnnouncement, deleteAnnouncement };
