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

export async function getDashboardStats(): Promise<DashboardStats> {
  const res = (await apiClient.get('/admin/dashboard')) as { success: boolean; data: DashboardStats };
  return res.data;
}

export async function getMembers(): Promise<UserProfile[]> {
  const res = (await apiClient.get('/admin/members')) as { success: boolean; data: UserProfile[] };
  return res.data;
}

export async function getInvitations(): Promise<InvitationRecord[]> {
  const res = (await apiClient.get('/admin/invitations')) as { success: boolean; data: InvitationRecord[] };
  return res.data;
}

export async function sendInvitation(payload: {
  email: string;
  role: string;
  first_name?: string;
}): Promise<InvitationRecord> {
  const res = (await apiClient.post('/admin/invitations', payload)) as {
    success: boolean;
    data: InvitationRecord;
  };
  return res.data;
}

export async function revokeInvitation(id: string): Promise<void> {
  await apiClient.delete(`/admin/invitations/${id}`);
}
