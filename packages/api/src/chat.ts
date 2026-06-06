import { apiClient } from './client';
import type { ChatMessage } from './types';

export async function getMessages(teamId: string, page = 1): Promise<ChatMessage[]> {
  const res = (await apiClient.get(`/chat/${teamId}/messages?page=${page}`)) as {
    success: boolean;
    data: ChatMessage[];
  };
  return res.data;
}

export async function sendMessage(teamId: string, body: string): Promise<ChatMessage> {
  const res = (await apiClient.post(`/chat/${teamId}/messages`, { body })) as {
    success: boolean;
    data: ChatMessage;
  };
  return res.data;
}
