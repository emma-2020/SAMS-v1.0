import { apiClient } from './client';
import type { FeeLedgerEntry } from './types';
export type { FeeLedgerEntry };

export async function getFees(playerId?: string): Promise<FeeLedgerEntry[]> {
  const params = playerId ? `?player_id=${playerId}` : '';
  const res = (await apiClient.get(`/fees${params}`)) as { success: boolean; data: { fees: FeeLedgerEntry[] } };
  return res.data?.fees ?? [];
}

export async function createFee(payload: {
  player_id: string;
  description: string;
  amount_owed: number;
  payment_method?: string;
  payment_date?: string;
  notes?: string;
}): Promise<FeeLedgerEntry> {
  const res = (await apiClient.post('/fees', payload)) as { success: boolean; data: { fee: FeeLedgerEntry } };
  return res.data.fee;
}

export async function updateFee(id: string, payload: {
  description?: string;
  amount_owed?: number;
  amount_paid?: number;
  payment_method?: string;
  payment_date?: string;
  notes?: string;
}): Promise<FeeLedgerEntry> {
  const res = (await apiClient.patch(`/fees/${id}`, payload)) as { success: boolean; data: { fee: FeeLedgerEntry } };
  return res.data.fee;
}

export async function deleteFee(id: string): Promise<void> {
  await apiClient.delete(`/fees/${id}`);
}
