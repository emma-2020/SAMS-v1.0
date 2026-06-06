import { apiClient } from './client';
import type { Team, TeamMember } from './types';

export async function getTeams(): Promise<Team[]> {
  const res = (await apiClient.get('/teams')) as { success: boolean; data: Team[] };
  return res.data;
}

export async function createTeam(payload: {
  name: string;
  sport?: string;
  division?: string;
  coach_id?: string;
}): Promise<Team> {
  const res = (await apiClient.post('/teams', payload)) as { success: boolean; data: Team };
  return res.data;
}

export async function deactivateTeam(id: string): Promise<void> {
  await apiClient.patch(`/teams/${id}`, { is_active: false });
}

export async function getTeamMembers(id: string): Promise<TeamMember[]> {
  const res = (await apiClient.get(`/teams/${id}/members`)) as { success: boolean; data: TeamMember[] };
  return res.data;
}

export async function addTeamMember(teamId: string, playerId: string): Promise<void> {
  await apiClient.post(`/teams/${teamId}/members`, { player_id: playerId });
}
