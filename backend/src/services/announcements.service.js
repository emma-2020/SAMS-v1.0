'use strict';

const { supabaseAdmin } = require('../config/supabase');
const { NotFoundError, InternalError } = require('../utils/errors');

async function listAnnouncements({ academyId }) {
  const { data, error } = await supabaseAdmin
    .from('announcements')
    .select(`
      id, title, body, created_at,
      author:users!announcements_created_by_fkey (id, first_name, last_name)
    `)
    .eq('academy_id', academyId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) throw new InternalError('Failed to fetch announcements.');
  return data || [];
}

async function createAnnouncement({ academyId, adminId, title, body }) {
  const { data, error } = await supabaseAdmin
    .from('announcements')
    .insert({
      academy_id: academyId,
      created_by: adminId,
      title:      title.trim(),
      body:       body.trim(),
    })
    .select(`
      id, title, body, created_at,
      author:users!announcements_created_by_fkey (id, first_name, last_name)
    `)
    .single();

  if (error) throw new InternalError('Failed to create announcement.');
  return data;
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
