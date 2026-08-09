// src/services/chat.service.js
'use strict';

const crypto            = require('crypto');
const { supabaseAdmin } = require('../config/supabase');
const notif             = require('./notifications.service');
const {
  ForbiddenError,
  NotFoundError,
  BadRequestError,
  InternalError,
} = require('../utils/errors');

const ATTACHMENT_BUCKET = 'chat-attachments';
const DEFAULT_LIMIT     = 50;
const MAX_LIMIT         = 100;
const SIGNED_URL_TTL    = 60 * 60; // 1 hour — re-signed on every fetch, so this only bounds staleness while offline/cached

// ─────────────────────────────────────────────────────────────────
// ATTACHMENT URL RESOLUTION
// The bucket is private; messages.attachment_url stores whatever URL
// uploadAttachment() returned at send time (a signed URL, or — for rows
// written before this bucket was made private — an old-style public
// URL). Neither stays valid forever, so every read re-signs a fresh
// URL from the storage path embedded in whatever was stored, instead
// of trusting the stored string directly.
// ─────────────────────────────────────────────────────────────────

function extractStoragePath(urlOrPath) {
  if (!urlOrPath) return null;
  const marker = `/${ATTACHMENT_BUCKET}/`;
  const idx = urlOrPath.indexOf(marker);
  const path = idx === -1 ? urlOrPath : urlOrPath.slice(idx + marker.length);
  return path.split('?')[0];
}

async function resolveAttachmentUrl(storedValue) {
  if (!storedValue) return storedValue;
  const path = extractStoragePath(storedValue);
  const { data, error } = await supabaseAdmin
    .storage
    .from(ATTACHMENT_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL);

  if (error) {
    console.error('[ChatService.resolveAttachmentUrl] sign error:', error.message);
    return null;
  }
  return data.signedUrl;
}

async function resolveAttachmentUrls(rows) {
  return Promise.all(rows.map(async (row) => (
    row.attachment_url
      ? { ...row, attachment_url: await resolveAttachmentUrl(row.attachment_url) }
      : row
  )));
}

// ─────────────────────────────────────────────────────────────────
// GET MESSAGES
// Accepts channel_id (new) or team_id (legacy — auto-resolved).
// ─────────────────────────────────────────────────────────────────

async function getMessages({ channelId, teamId, userId, academyId, role, limit, before }) {
  const resolvedChannelId = await resolveChannelId({ channelId, teamId, academyId });
  await assertChannelMembership({ channelId: resolvedChannelId, userId, academyId, role });

  const pageSize = Math.min(Number(limit) || DEFAULT_LIMIT, MAX_LIMIT);

  let query = supabaseAdmin
    .from('messages')
    .select(`
      id, team_id, channel_id, sender_id, message_text,
      attachment_url, file_name, mime_type, file_size,
      created_at,
      users!messages_sender_id_fkey ( id, first_name, last_name, role, avatar_url )
    `)
    .eq('academy_id', academyId)
    .eq('channel_id', resolvedChannelId)
    .order('created_at', { ascending: false })
    .limit(pageSize);

  if (before) {
    const { data: cursor } = await supabaseAdmin
      .from('messages')
      .select('created_at')
      .eq('id', before)
      .eq('academy_id', academyId)
      .single();
    if (cursor) query = query.lt('created_at', cursor.created_at);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[ChatService.getMessages]', error.message);
    throw new InternalError('Failed to fetch messages. Please try again.');
  }

  const messages = await resolveAttachmentUrls((data || []).reverse());

  // Fetch channel name for response
  const { data: ch } = await supabaseAdmin
    .from('chat_channels')
    .select('id, name')
    .eq('id', resolvedChannelId)
    .single();

  return {
    team:     { id: resolvedChannelId, name: ch?.name ?? 'Channel' },
    messages,
    page: {
      count:     messages.length,
      limit:     pageSize,
      has_more:  messages.length === pageSize,
      oldest_id: messages[0]?.id ?? null,
    },
  };
}

// ─────────────────────────────────────────────────────────────────
// UPLOAD ATTACHMENT
// ─────────────────────────────────────────────────────────────────

async function uploadAttachment({ channelId, teamId, userId, academyId, role, fileBuffer, mimetype, originalname, fileSize }) {
  const resolvedChannelId = await resolveChannelId({ channelId, teamId, academyId });
  await assertChannelMembership({ channelId: resolvedChannelId, userId, academyId, role });

  const safeName    = originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `${academyId}/${resolvedChannelId}/${Date.now()}_${crypto.randomBytes(4).toString('hex')}_${safeName}`;

  const { error: uploadError } = await supabaseAdmin
    .storage
    .from(ATTACHMENT_BUCKET)
    .upload(storagePath, fileBuffer, { contentType: mimetype, upsert: false });

  if (uploadError) {
    console.error('[ChatService.uploadAttachment] storage upload failed:', uploadError.message);
    throw new InternalError('File upload failed. Please try again.');
  }

  const { data, error: signError } = await supabaseAdmin
    .storage
    .from(ATTACHMENT_BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_TTL);

  if (signError) {
    console.error('[ChatService.uploadAttachment] sign error:', signError.message);
    throw new InternalError('File upload failed. Please try again.');
  }

  return { url: data.signedUrl, file_name: originalname, mime_type: mimetype, file_size: fileSize };
}

// ─────────────────────────────────────────────────────────────────
// SEND MESSAGE
// ─────────────────────────────────────────────────────────────────

async function sendMessage({ channelId, teamId, senderId, academyId, role, messageText, attachmentUrl, fileName, mimeType, fileSize, clientMessageId }) {
  const resolvedChannelId = await resolveChannelId({ channelId, teamId, academyId });
  await assertChannelMembership({ channelId: resolvedChannelId, userId: senderId, academyId, role });

  const cleanText = messageText ? messageText.trim() : null;
  if (!cleanText && !attachmentUrl) {
    throw new BadRequestError('Message must contain text or an attachment.');
  }

  // Resolve team_id if this is a team channel (for backwards-compat insert)
  const { data: ch } = await supabaseAdmin
    .from('chat_channels')
    .select('id, name, team_id, type')
    .eq('id', resolvedChannelId)
    .single();

  // For DM channels: block message if recipient has blocked the sender
  if (ch?.type === 'direct') {
    const { data: otherMember } = await supabaseAdmin
      .from('chat_channel_members')
      .select('user_id')
      .eq('channel_id', resolvedChannelId)
      .neq('user_id', senderId)
      .limit(1)
      .maybeSingle();

    if (otherMember) {
      const { data: blockRow } = await supabaseAdmin
        .from('blocked_users')
        .select('blocker_id')
        .eq('blocker_id', otherMember.user_id)
        .eq('blocked_id', senderId)
        .maybeSingle();
      if (blockRow) throw new ForbiddenError('You cannot send messages to this user.');
    }
  }

  const { data, error } = await supabaseAdmin
    .from('messages')
    .insert({
      academy_id:        academyId,
      channel_id:        resolvedChannelId,
      team_id:           ch?.team_id || null,
      sender_id:         senderId,
      message_text:      cleanText    || null,
      attachment_url:    attachmentUrl || null,
      file_name:         fileName     || null,
      mime_type:         mimeType     || null,
      file_size:         fileSize     || null,
      client_message_id: clientMessageId || null,
    })
    .select(`
      id, team_id, channel_id, sender_id, message_text,
      attachment_url, file_name, mime_type, file_size, client_message_id,
      created_at,
      users!messages_sender_id_fkey ( id, first_name, last_name, role, avatar_url )
    `)
    .single();

  if (error) {
    // 23505 = unique_violation. An offline-queued send that's retried (e.g.
    // the first response was lost mid-flight, or two retries raced each
    // other) lands here on the retry — fetch and return the row that
    // actually won the insert instead of erroring or duplicating it.
    if (error.code === '23505' && clientMessageId) {
      const { data: winner } = await supabaseAdmin
        .from('messages')
        .select(`
          id, team_id, channel_id, sender_id, message_text,
          attachment_url, file_name, mime_type, file_size, client_message_id,
          created_at,
          users!messages_sender_id_fkey ( id, first_name, last_name, role, avatar_url )
        `)
        .eq('academy_id', academyId)
        .eq('channel_id', resolvedChannelId)
        .eq('sender_id', senderId)
        .eq('client_message_id', clientMessageId)
        .single();
      if (winner) return { ...winner, attachment_url: await resolveAttachmentUrl(winner.attachment_url) };
    }
    console.error('[ChatService.sendMessage]', error.message);
    throw new InternalError('Failed to send message. Please try again.');
  }

  // Fire-and-forget notifications
  (async () => {
    try {
      const sender     = data.users;
      const senderName = sender ? `${sender.first_name} ${sender.last_name}` : 'Someone';
      const preview    = cleanText
        ? (cleanText.length > 80 ? `${cleanText.slice(0, 80)}…` : cleanText)
        : 'Sent an attachment';
      const title = `New message in ${ch?.name ?? 'Chat'}`;
      const body  = `${senderName}: ${preview}`;

      // Get all channel members except sender (includes mute state)
      const { data: members } = await supabaseAdmin
        .from('chat_channel_members')
        .select('user_id, is_muted, muted_until, users!chat_channel_members_user_id_fkey(role)')
        .eq('channel_id', resolvedChannelId)
        .neq('user_id', senderId);

      const now = new Date().toISOString();
      const byRole = { Coach: [], Player: [], Parent: [], Admin: [] };
      for (const m of (members || [])) {
        // Skip users who are currently muted in this channel
        if (m.is_muted && (!m.muted_until || m.muted_until > now)) continue;
        const r = m.users?.role;
        if (r && byRole[r]) byRole[r].push(m.user_id);
      }

      if (byRole.Coach.length > 0) {
        await notif.createForMany({
          academyId, recipientIds: byRole.Coach,
          type: 'chat', title, body, link: '/dashboard/coach/chat',
        });
      }
      if (byRole.Player.length > 0) {
        await notif.createForMany({
          academyId, recipientIds: byRole.Player,
          type: 'chat', title, body, link: '/dashboard/player/chat',
        });
      }
      if (byRole.Parent.length > 0) {
        await notif.createForMany({
          academyId, recipientIds: byRole.Parent,
          type: 'chat', title, body, link: '/dashboard/parent/chat',
        });
      }
      if (byRole.Admin.length > 0) {
        await notif.createForMany({
          academyId, recipientIds: byRole.Admin,
          type: 'chat', title, body, link: '/dashboard/admin/chat',
        });
      }
    } catch (e) { console.error('[ChatService] notify error:', e.message); }
  })();

  return { ...data, attachment_url: await resolveAttachmentUrl(data.attachment_url) };
}

// ─────────────────────────────────────────────────────────────────
// DELETE MESSAGE
// ─────────────────────────────────────────────────────────────────

async function deleteMessage({ messageId, userId, academyId, role }) {
  const { data: msg, error: fetchErr } = await supabaseAdmin
    .from('messages')
    .select('id, sender_id')
    .eq('id', messageId)
    .eq('academy_id', academyId)
    .single();

  if (fetchErr || !msg) throw new NotFoundError('Message not found.');

  if (role !== 'Admin' && msg.sender_id !== userId) {
    throw new ForbiddenError('You can only delete your own messages.');
  }

  const { error: delErr } = await supabaseAdmin
    .from('messages')
    .delete()
    .eq('id', messageId)
    .eq('academy_id', academyId);

  if (delErr) {
    console.error('[ChatService.deleteMessage]', delErr.message);
    throw new InternalError('Failed to delete message. Please try again.');
  }

  return { deleted: true };
}

// ─────────────────────────────────────────────────────────────────
// INTERNAL HELPERS
// ─────────────────────────────────────────────────────────────────

async function resolveChannelId({ channelId, teamId, academyId }) {
  if (channelId) return channelId;

  // Legacy: resolve team_id → channel_id
  if (teamId) {
    const { data } = await supabaseAdmin
      .from('chat_channels')
      .select('id')
      .eq('team_id', teamId)
      .eq('academy_id', academyId)
      .eq('type', 'team')
      .single();
    if (data?.id) return data.id;
  }

  throw new NotFoundError('Channel not found.');
}

async function assertChannelMembership({ channelId, userId, academyId, role }) {
  if (role === 'Admin') return; // Admins have full academy access

  const { data } = await supabaseAdmin
    .from('chat_channel_members')
    .select('user_id')
    .eq('channel_id', channelId)
    .eq('user_id', userId)
    .single();

  if (!data) throw new ForbiddenError('You are not a member of this channel.');
}

module.exports = { getMessages, sendMessage, uploadAttachment, deleteMessage, resolveAttachmentUrl };
