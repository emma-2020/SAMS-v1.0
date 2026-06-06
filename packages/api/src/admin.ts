import { apiClient } from './client';
import type { InvitationRecord, UserProfile } from './types';

interface DashboardStats {
  total_members: number;
  total_coaches: number;
  total_players: number;
  total_parents: number;
  pending_invitations: number;
  active_teams: number;
}

// No dedicated /admin/dashboard endpoint — derive from roster + invitations
export async function getDashboardStats(): Promise<DashboardStats> {
  const [members, invitations] = await Promise.all([
    getMembers().catch(() => [] as UserProfile[]),
    getInvitations().catch(() => [] as InvitationRecord[]),
  ]);
  return {
    total_members:       members.length,
    total_coaches:       members.filter((m) => m.role === 'Coach').length,
    total_players:       members.filter((m) => m.role === 'Player').length,
    total_parents:       members.filter((m) => m.role === 'Parent').length,
    pending_invitations: invitations.filter((i) => i.status === 'pending').length,
    active_teams:        0,
  };
}

// Backend: GET /admin/roster → { success, data: { members: UserProfile[] } }
export async function getMembers(): Promise<UserProfile[]> {
  const res = (await apiClient.get('/admin/roster')) as {
    success: boolean;
    data: { members: UserProfile[] };
  };
  return res.data?.members ?? [];
}

// Backend: GET /admin/invite → { success, data: { invitations: InvitationRecord[] } }
export async function getInvitations(): Promise<InvitationRecord[]> {
  const res = (await apiClient.get('/admin/invite')) as {
    success: boolean;
    data: { invitations: InvitationRecord[] };
  };
  return res.data?.invitations ?? [];
}

// Backend: POST /admin/invite
export async function sendInvitation(payload: {
  email: string;
  role: string;
  first_name?: string;
}): Promise<InvitationRecord> {
  const res = (await apiClient.post('/admin/invite', payload)) as {
    success: boolean;
    data: { invitation: InvitationRecord };
  };
  return res.data.invitation;
}

// Backend: DELETE /admin/invite/:id
export async function revokeInvitation(id: string): Promise<void> {
  await apiClient.delete(`/admin/invite/${id}`);
}
