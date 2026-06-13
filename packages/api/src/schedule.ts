import { apiClient } from './client';
import type { ScheduleEvent } from './types';

// Backend shape: { success, count, data: { events: ScheduleEvent[] } }
export async function getEvents(): Promise<ScheduleEvent[]> {
  const res = (await apiClient.get('/schedule')) as {
    success: boolean;
    data: { events: ScheduleEvent[] } | ScheduleEvent[];
  };
  const payload = res.data as any;
  return Array.isArray(payload) ? payload : payload?.events ?? [];
}

// Backend shape: { success, data: { event: ScheduleEvent } }
export async function createEvent(payload: Omit<ScheduleEvent, 'id'>): Promise<ScheduleEvent> {
  const res = (await apiClient.post('/schedule', payload)) as {
    success: boolean;
    data: { event: ScheduleEvent };
  };
  return res.data.event;
}

export async function updateEvent(id: string, payload: Partial<Omit<ScheduleEvent, 'id'>>): Promise<ScheduleEvent> {
  const res = (await apiClient.put(`/schedule/${id}`, payload)) as {
    success: boolean;
    data: { event: ScheduleEvent };
  };
  return res.data.event;
}

export async function deleteEvent(id: string): Promise<void> {
  await apiClient.delete(`/schedule/${id}`);
}
