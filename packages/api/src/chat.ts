import { apiClient } from './client';
import type { ChatMessage, ChatAttachment } from './types';
export type { ChatAttachment };

// Backend:  GET /chat?team_id=:uuid&limit=50
// Response: { success, data: { team, messages: [...], page } }
// ChatMessage.body maps from backend message_text field
export async function getMessages(teamId: string): Promise<ChatMessage[]> {
  const res = (await apiClient.get(`/chat?team_id=${teamId}&limit=50`)) as {
    success: boolean;
    data: {
      messages: Array<{
        id: string;
        team_id: string;
        sender_id: string;
        message_text: string | null;
        attachment_url?: string | null;
        file_name?: string | null;
        mime_type?: string | null;
        file_size?: number | null;
        created_at: string;
        users?: { id: string; first_name: string; last_name: string; role: string } | null;
      }>;
    };
  };
  return (res.data?.messages ?? []).map((m) => ({
    id:             m.id,
    team_id:        m.team_id,
    sender_id:      m.sender_id,
    body:           m.message_text ?? null,
    created_at:     m.created_at,
    attachment_url: m.attachment_url ?? null,
    file_name:      m.file_name ?? null,
    mime_type:      m.mime_type ?? null,
    file_size:      m.file_size ?? null,
    sender:         m.users ? { ...m.users, email: '' } : undefined,
  }));
}

// Backend:  POST /chat  body: { team_id, message_text?, attachment_url?, ... }
export async function sendMessage(
  teamId: string,
  body: string,
  attachment?: ChatAttachment,
): Promise<ChatMessage> {
  const payload: Record<string, unknown> = { team_id: teamId };
  if (body.trim()) payload.message_text = body;
  if (attachment) {
    payload.attachment_url = attachment.url;
    payload.file_name      = attachment.file_name;
    payload.mime_type      = attachment.mime_type;
    payload.file_size      = attachment.file_size;
  }

  const res = (await apiClient.post('/chat', payload)) as {
    success: boolean;
    data: {
      message: {
        id: string;
        team_id: string;
        sender_id: string;
        message_text: string | null;
        attachment_url?: string | null;
        file_name?: string | null;
        mime_type?: string | null;
        file_size?: number | null;
        created_at: string;
      };
    };
  };
  const m = res.data.message;
  return {
    id:             m.id,
    team_id:        m.team_id,
    sender_id:      m.sender_id,
    body:           m.message_text ?? null,
    created_at:     m.created_at,
    attachment_url: m.attachment_url ?? null,
    file_name:      m.file_name ?? null,
    mime_type:      m.mime_type ?? null,
    file_size:      m.file_size ?? null,
  };
}

// Backend:  DELETE /chat/:messageId
// Sender may delete their own messages; Admin may delete any.
export async function deleteMessage(messageId: string): Promise<void> {
  await apiClient.delete(`/chat/${messageId}`);
}

// Backend:  POST /chat/upload  multipart: { file, team_id }
//
// The apiClient instance defaults to Content-Type: application/json.
// Axios 1.x sees that default + FormData data and converts FormData to
// JSON via formDataToJSON(), sending application/json to the server.
// Multer never parses a JSON body, so req.file is always undefined.
//
// Fix: delete Content-Type inside transformRequest (runs after header
// merging) so the browser's XHR sets multipart/form-data; boundary=…
// automatically when it receives a FormData body.
export async function uploadChatAttachment(teamId: string, file: File): Promise<ChatAttachment> {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('team_id', teamId);
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
  })) as {
    success: boolean;
    data: ChatAttachment;
  };
  return res.data;
}
