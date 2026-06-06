import { apiClient } from './client';
import type { ScheduleEvent } from './types';

export async function getEvents(): Promise<ScheduleEvent[]> {
  const res = (await apiClient.get('/schedule')) as { success: boolean; data: ScheduleEvent[] };
  return res.data;
}

export async function createEvent(payload: Omit<ScheduleEvent, 'id'>): Promise<ScheduleEvent> {
  const res = (await apiClient.post('/schedule', payload)) as { success: boolean; data: ScheduleEvent };
  return res.data;
}

export async function deleteEvent(id: string): Promise<void> {
  await apiClient.delete(`/schedule/${id}`);
}
