import { apiClient } from './client';
import type { ChatMessage } from './types';

// Backend:  GET /chat?team_id=:uuid&limit=50
// Response: { success, data: { team, messages: [{id,team_id,sender_id,message_text,created_at,users}], page } }
// ChatMessage.body maps from backend message_text field
export async function getMessages(teamId: string): Promise<ChatMessage[]> {
  const res = (await apiClient.get(`/chat?team_id=${teamId}&limit=50`)) as {
    success: boolean;
    data: {
      messages: Array<{
        id: string;
        team_id: string;
        sender_id: string;
        message_text: string;
        created_at: string;
        users?: { id: string; first_name: string; last_name: string; role: string } | null;
      }>;
    };
  };
  return (res.data?.messages ?? []).map((m) => ({
    id:         m.id,
    team_id:    m.team_id,
    sender_id:  m.sender_id,
    body:       m.message_text,
    created_at: m.created_at,
    sender:     m.users ?? undefined,
  }));
}

// Backend:  POST /chat  body: { team_id, message_text }
// Response: { success, data: { message: {...} } }
export async function sendMessage(teamId: string, body: string): Promise<ChatMessage> {
  const res = (await apiClient.post('/chat', { team_id: teamId, message_text: body })) as {
    success: boolean;
    data: {
      message: {
        id: string;
        team_id: string;
        sender_id: string;
        message_text: string;
        created_at: string;
      };
    };
  };
  const m = res.data.message;
  return {
    id:         m.id,
    team_id:    m.team_id,
    sender_id:  m.sender_id,
    body:       m.message_text,
    created_at: m.created_at,
  };
}
