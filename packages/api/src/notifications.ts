import { apiClient } from './client';
import type { Notification } from './types';

export async function getAll(): Promise<Notification[]> {
  const res = (await apiClient.get('/notifications')) as { success: boolean; data: Notification[] };
  return res.data ?? [];
}

export async function markRead(id: string): Promise<void> {
  await apiClient.patch(`/notifications/${id}/read`);
}

export async function markAllRead(): Promise<void> {
  await apiClient.patch('/notifications/read-all');
}

export async function remove(id: string): Promise<void> {
  await apiClient.delete(`/notifications/${id}`);
}
