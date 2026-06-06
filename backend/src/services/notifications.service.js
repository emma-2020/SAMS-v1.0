'use strict';
const { supabaseAdmin } = require('../config/supabase');
const { NotFoundError } = require('../utils/errors');

/**
 * Create a notification for a single user.
 * Silently swallows errors so notification failures never break the main flow.
 */
async function create({ academyId, recipientId, type, title, body = null, link = null }) {
  const { error } = await supabaseAdmin
    .from('notifications')
    .insert({ academy_id: academyId, recipient_id: recipientId, type, title, body, link });
  if (error) console.error('[notifications] create error:', error.message);
}

/**
 * Bulk-create the same notification for many recipients.
 */
async function createForMany({ academyId, recipientIds, type, title, body = null, link = null }) {
  if (!recipientIds?.length) return;
  const rows = recipientIds.map(id => ({
    academy_id: academyId, recipient_id: id, type, title, body, link,
  }));
  const { error } = await supabaseAdmin.from('notifications').insert(rows);
  if (error) console.error('[notifications] createForMany error:', error.message);
}

/**
 * Get all notifications for the requesting user (last 50).
 */
async function getForUser(userId) {
  const { data, error } = await supabaseAdmin
    .from('notifications')
    .select('*')
    .eq('recipient_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return data || [];
}

/**
 * Count unread notifications for a user.
 */
async function countUnread(userId) {
  const { count, error } = await supabaseAdmin
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('recipient_id', userId)
    .eq('is_read', false);
  if (error) throw error;
  return count ?? 0;
}

/**
 * Mark a single notification as read.
 */
async function markRead(notificationId, userId) {
  const { data, error } = await supabaseAdmin
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
    .eq('recipient_id', userId)
    .select('id')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new NotFoundError('Notification not found');
  return data;
}

/**
 * Mark all notifications as read for a user.
 */
async function markAllRead(userId) {
  const { error } = await supabaseAdmin
    .from('notifications')
    .update({ is_read: true })
    .eq('recipient_id', userId)
    .eq('is_read', false);
  if (error) throw error;
}

/**
 * Delete a notification.
 */
async function remove(notificationId, userId) {
  const { error } = await supabaseAdmin
    .from('notifications')
    .delete()
    .eq('id', notificationId)
    .eq('recipient_id', userId);
  if (error) throw error;
}

/**
 * Notify all admins + coaches in an academy.
 */
async function notifyStaff({ academyId, type, title, body, link }) {
  const { data: staff, error } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('academy_id', academyId)
    .in('role', ['Admin', 'Coach']);
  if (error) { console.error('[notifications] notifyStaff lookup error:', error.message); return; }
  await createForMany({ academyId, recipientIds: (staff || []).map(u => u.id), type, title, body, link });
}

module.exports = { create, createForMany, getForUser, countUnread, markRead, markAllRead, remove, notifyStaff };
