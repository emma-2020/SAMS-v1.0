import { apiClient } from './client';
import type { Team, TeamMember } from './types';

// Backend shape: { success, data: { teams: Team[] } }
export async function getTeams(): Promise<Team[]> {
  const res = (await apiClient.get('/teams')) as {
    success: boolean;
    data: { teams: Team[] };
  };
  return res.data?.teams ?? [];
}

// Backend shape: { success, data: { team: Team } }
export async function createTeam(payload: {
  name: string;
  sport?: string;
  division?: string;
  coach_id?: string;
}): Promise<Team> {
  const res = (await apiClient.post('/teams', payload)) as {
    success: boolean;
    data: { team: Team };
  };
  return res.data.team;
}

export async function deactivateTeam(id: string): Promise<void> {
  await apiClient.delete(`/teams/${id}`);
}

// Backend shape: { success, data: { team, rosters: [{players: TeamMember, ...}] } }
export async function getTeamMembers(id: string): Promise<TeamMember[]> {
  const res = (await apiClient.get(`/teams/${id}/members`)) as {
    success: boolean;
    data: {
      team: { id: string; name: string };
      rosters: Array<{
        player_id: string;
        parent_id: string | null;
        players: TeamMember | null;
        parents: TeamMember | null;
      }>;
    };
  };
  return (res.data?.rosters ?? [])
    .map((r) => r.players)
    .filter((p): p is TeamMember => p != null);
}

export async function addTeamMember(teamId: string, playerId: string): Promise<void> {
  await apiClient.post(`/teams/${teamId}/members`, { player_id: playerId });
}
