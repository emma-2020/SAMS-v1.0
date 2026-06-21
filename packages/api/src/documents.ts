import { apiClient } from './client';
import type { PlayerDocument } from './types';
export type { PlayerDocument };

export async function getDocuments(playerId?: string): Promise<PlayerDocument[]> {
  const params = playerId ? `?player_id=${playerId}` : '';
  const res = (await apiClient.get(`/documents${params}`)) as { success: boolean; data: { documents: PlayerDocument[] } };
  return res.data?.documents ?? [];
}

export async function createDocument(payload: {
  player_id: string;
  doc_type: string;
  file_name: string;
  file_url: string;
  file_size?: number;
}): Promise<PlayerDocument> {
  const res = (await apiClient.post('/documents', payload)) as { success: boolean; data: { document: PlayerDocument } };
  return res.data.document;
}

export async function deleteDocument(id: string): Promise<void> {
  await apiClient.delete(`/documents/${id}`);
}
