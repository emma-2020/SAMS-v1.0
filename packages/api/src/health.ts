import { apiClient } from './client';
import type { HealthEntry } from './types';

interface HealthSubmission {
  energy: number;
  sleep: number;
  muscle_soreness: number;
  stress: number;
  notes?: string;
}

export async function submitHealth(payload: HealthSubmission): Promise<HealthEntry> {
  const res = (await apiClient.post('/health', payload)) as { success: boolean; data: HealthEntry };
  return res.data;
}

export async function getMyHealth(): Promise<HealthEntry[]> {
  const res = (await apiClient.get('/health/me')) as { success: boolean; data: HealthEntry[] };
  return res.data;
}

export async function getHealthAlerts(): Promise<HealthEntry[]> {
  const res = (await apiClient.get('/health/alerts')) as { success: boolean; data: HealthEntry[] };
  return res.data;
}

export async function getHealthLogs(): Promise<HealthEntry[]> {
  const res = (await apiClient.get('/health')) as { success: boolean; data: HealthEntry[] };
  return res.data;
}
