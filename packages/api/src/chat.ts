import { apiClient } from './client';
import type {
  ChatMessage,
  ChatAttachment,
  ChatChannel,
  ChatChannelMember,
  TeamMember,
  BlockedUser,
  ReportedMessage,
  AcademySettings,
  UserSearchResult,
} from './types';
export type { ChatAttachment, ChatChannel, ChatChannelMember, BlockedUser, ReportedMessage, AcademySettings, UserSearchResult };

// ── Type helpers ──────────────────────────────────────────────────

function mapMessage(m: {
  id: string; channel_id?: string; team_id?: string | null; sender_id: string;
  message_text: string | null; attachment_url?: string | null;
  file_name?: string | null; mime_type?: string | null; file_size?: number | null;
  created_at: string;
  users?: { id: string; first_name: string; last_name: string; role: string } | null;
}): ChatMessage {
  return {
    id:             m.id,
    channel_id:     m.channel_id ?? m.team_id ?? '',
    team_id:        m.team_id ?? null,
    sender_id:      m.sender_id,
    body:           m.message_text ?? null,
    created_at:     m.created_at,
    attachment_url: m.attachment_url ?? null,
    file_name:      m.file_name ?? null,
    mime_type:      m.mime_type ?? null,
    file_size:      m.file_size ?? null,
    sender:         m.users ? { ...m.users, email: '' } : undefined,
  };
}

// ── Messages ──────────────────────────────────────────────────────

// Backend: GET /chat?channel_id=:uuid&limit=50
export async function getMessages(channelId: string): Promise<ChatMessage[]> {
  const res = (await apiClient.get(`/chat?channel_id=${channelId}&limit=50`)) as {
    success: boolean;
    data: { messages: Parameters<typeof mapMessage>[0][] };
  };
  return (res.data?.messages ?? []).map(mapMessage);
}

// Backend: POST /chat  { channel_id, message_text?, attachment_url?, ... }
export async function sendMessage(
  channelId: string,
  body: string,
  attachment?: ChatAttachment,
): Promise<ChatMessage> {
  const payload: Record<string, unknown> = { channel_id: channelId };
  if (body.trim()) payload.message_text = body;
  if (attachment) {
    payload.attachment_url = attachment.url;
    payload.file_name      = attachment.file_name;
    payload.mime_type      = attachment.mime_type;
    payload.file_size      = attachment.file_size;
  }

  const res = (await apiClient.post('/chat', payload)) as {
    success: boolean;
    data: { message: Parameters<typeof mapMessage>[0] };
  };
  return mapMessage(res.data.message);
}

// Backend: DELETE /chat/:messageId
export async function deleteMessage(messageId: string): Promise<void> {
  await apiClient.delete(`/chat/${messageId}`);
}

// Backend: POST /chat/upload  multipart: { file, channel_id }
export async function uploadChatAttachment(channelId: string, file: File): Promise<ChatAttachment> {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('channel_id', channelId);
  const res = (await apiClient.post('/chat/upload', fd, {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    transformRequest: [(data: FormData, headers: any) => {
      if (headers?.delete) {
        headers.delete('Content-Type');
      } else if (headers) {
        delete headers['Content-Type'];
      }
      return data;
    }],
  })) as { success: boolean; data: ChatAttachment };
  return res.data;
}

// ── Channels ──────────────────────────────────────────────────────

// Backend: GET /chat/channels
export async function listChannels(): Promise<ChatChannel[]> {
  const res = (await apiClient.get('/chat/channels')) as {
    success: boolean;
    data: { channels: ChatChannel[] };
  };
  return res.data?.channels ?? [];
}

// Backend: POST /chat/channels
export async function createGroup(params: {
  name: string;
  type: 'role_group' | 'custom_group';
  description?: string;
  icon_color?: string;
  target_role?: 'Coach' | 'Player' | 'Parent';
  member_ids?: string[];
}): Promise<ChatChannel> {
  const res = (await apiClient.post('/chat/channels', params)) as {
    success: boolean;
    data: { channel: ChatChannel };
  };
  return res.data.channel;
}

// Backend: PATCH /chat/channels/:id
export async function updateGroup(
  channelId: string,
  params: { name?: string; description?: string; icon_color?: string },
): Promise<ChatChannel> {
  const res = (await apiClient.patch(`/chat/channels/${channelId}`, params)) as {
    success: boolean;
    data: { channel: ChatChannel };
  };
  return res.data.channel;
}

// Backend: DELETE /chat/channels/:id
export async function deleteGroup(channelId: string): Promise<void> {
  await apiClient.delete(`/chat/channels/${channelId}`);
}

// Backend: GET /chat/channels/:id/members
export async function getChannelMembers(channelId: string): Promise<ChatChannelMember[]> {
  const res = (await apiClient.get(`/chat/channels/${channelId}/members`)) as {
    success: boolean;
    data: { members: ChatChannelMember[] };
  };
  return res.data?.members ?? [];
}

// Backend: POST /chat/channels/:id/members
export async function addChannelMember(channelId: string, userId: string): Promise<void> {
  await apiClient.post(`/chat/channels/${channelId}/members`, { user_id: userId });
}

// Backend: DELETE /chat/channels/:id/members/:userId
export async function removeChannelMember(channelId: string, userId: string): Promise<void> {
  await apiClient.delete(`/chat/channels/${channelId}/members/${userId}`);
}

// Backend: POST /chat/direct  { target_user_id }
export async function getOrCreateDirect(targetUserId: string): Promise<ChatChannel> {
  const res = (await apiClient.post('/chat/direct', { target_user_id: targetUserId })) as {
    success: boolean;
    data: { channel: ChatChannel };
  };
  return res.data.channel;
}

// Backend: GET /chat/users?q=query
export async function searchUsers(query: string): Promise<UserSearchResult> {
  const res = (await apiClient.get(`/chat/users?q=${encodeURIComponent(query)}`)) as {
    success: boolean;
    data: UserSearchResult;
  };
  return res.data ?? { users: [], academy_allows_coach_player_dm: false };
}

// ── Leave / Mute ──────────────────────────────────────────────────

// Backend: DELETE /chat/channels/:id/leave
export async function leaveChannel(channelId: string): Promise<void> {
  await apiClient.delete(`/chat/channels/${channelId}/leave`);
}

// Backend: PATCH /chat/channels/:id/mute  { muted_until?: ISO string | null }
export async function muteChannel(channelId: string, mutedUntil?: string | null): Promise<void> {
  await apiClient.patch(`/chat/channels/${channelId}/mute`, { muted_until: mutedUntil ?? null });
}

// Backend: PATCH /chat/channels/:id/unmute
export async function unmuteChannel(channelId: string): Promise<void> {
  await apiClient.patch(`/chat/channels/${channelId}/unmute`, {});
}

// ── Block / Unblock ───────────────────────────────────────────────

// Backend: GET /chat/block
export async function getBlockedUsers(): Promise<BlockedUser[]> {
  const res = (await apiClient.get('/chat/block')) as {
    success: boolean;
    data: { users: BlockedUser[] };
  };
  return res.data?.users ?? [];
}

// Backend: POST /chat/block/:userId
export async function blockUser(userId: string): Promise<void> {
  await apiClient.post(`/chat/block/${userId}`, {});
}

// Backend: DELETE /chat/block/:userId
export async function unblockUser(userId: string): Promise<void> {
  await apiClient.delete(`/chat/block/${userId}`);
}

// ── Report messages ───────────────────────────────────────────────

// Backend: POST /chat/messages/:messageId/report  { reason, notes? }
export async function reportMessage(messageId: string, reason: string, notes?: string): Promise<void> {
  await apiClient.post(`/chat/messages/${messageId}/report`, { reason, notes });
}

// Backend: GET /chat/admin/reports  (Admin only)
export async function getReports(): Promise<ReportedMessage[]> {
  const res = (await apiClient.get('/chat/admin/reports')) as {
    success: boolean;
    data: { reports: ReportedMessage[] };
  };
  return res.data?.reports ?? [];
}

// Backend: PATCH /chat/admin/reports/:reportId  { status }
export async function reviewReport(
  reportId: string,
  status: 'reviewed' | 'dismissed',
): Promise<void> {
  await apiClient.patch(`/chat/admin/reports/${reportId}`, { status });
}

// ── Academy chat policy settings (Admin only) ─────────────────────

// Backend: GET /chat/admin/settings
export async function getChatSettings(): Promise<AcademySettings> {
  const res = (await apiClient.get('/chat/admin/settings')) as {
    success: boolean;
    data: { settings: AcademySettings };
  };
  return res.data?.settings ?? {};
}

// Backend: PATCH /chat/admin/settings  { chat_coach_player_dm: boolean, ... }
export async function updateChatSettings(settings: Partial<AcademySettings>): Promise<AcademySettings> {
  const res = (await apiClient.patch('/chat/admin/settings', settings)) as {
    success: boolean;
    data: { settings: AcademySettings };
  };
  return res.data?.settings ?? {};
}
