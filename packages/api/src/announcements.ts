import { apiClient } from './client';
import type { Announcement } from './types';
export type { Announcement };

export async function getAnnouncements(): Promise<Announcement[]> {
  const res = (await apiClient.get('/announcements')) as { success: boolean; data: { announcements: Announcement[] } };
  return res.data?.announcements ?? [];
}

export async function createAnnouncement(payload: { title: string; body: string; audience?: 'everyone' | 'players' | 'coaches' | 'parents' }): Promise<Announcement> {
  const res = (await apiClient.post('/announcements', payload)) as { success: boolean; data: { announcement: Announcement } };
  return res.data.announcement;
}

export async function deleteAnnouncement(id: string): Promise<void> {
  await apiClient.delete(`/announcements/${id}`);
}
