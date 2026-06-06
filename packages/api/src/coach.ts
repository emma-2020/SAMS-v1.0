import { apiClient } from './client';
import type { Player } from './types';

interface PlayerProfile {
  player: Player;
  health_history: unknown[];
  workouts: unknown[];
  schedule: unknown[];
}

export async function getPlayers(): Promise<Player[]> {
  const res = (await apiClient.get('/coach/players')) as { success: boolean; data: Player[] };
  return res.data;
}

export async function getPlayerProfile(id: string): Promise<PlayerProfile> {
  const res = (await apiClient.get(`/coach/players/${id}/profile`)) as {
    success: boolean;
    data: PlayerProfile;
  };
  return res.data;
}
