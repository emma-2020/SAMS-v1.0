import { apiClient } from './client';
import type { InvitationRecord, UserProfile, MemberDetail, AcademyAdminSettings } from './types';
export type { MemberDetail, AcademyAdminSettings };

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
  last_name?: string;
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

// Backend: GET /admin/roster/:id
export async function getMemberDetail(id: string): Promise<MemberDetail> {
  const res = (await apiClient.get(`/admin/roster/${id}`)) as {
    success: boolean;
    data: { member: MemberDetail };
  };
  return res.data.member;
}

// Backend: PATCH /admin/roster/:id — update first/last name
export async function updateMember(id: string, payload: { first_name?: string; last_name?: string }): Promise<UserProfile> {
  const res = (await apiClient.patch(`/admin/roster/${id}`, payload)) as {
    success: boolean;
    data: { member: UserProfile };
  };
  return res.data.member;
}

// Backend: POST /admin/roster/:id/reset-link
export async function getMemberResetLink(id: string): Promise<{ reset_link: string; email: string }> {
  const res = (await apiClient.post(`/admin/roster/${id}/reset-link`, {})) as {
    success: boolean;
    data: { reset_link: string; email: string };
  };
  return res.data;
}

// Backend: PATCH /admin/roster/:id/status
export async function setMemberStatus(id: string, isActive: boolean): Promise<UserProfile> {
  const res = (await apiClient.patch(`/admin/roster/${id}/status`, { is_active: isActive })) as {
    success: boolean;
    data: { member: UserProfile };
  };
  return res.data.member;
}

// Backend: PATCH /admin/roster/:id/availability
export async function updateAvailability(
  id: string,
  status: 'Available' | 'Injured' | 'Suspended' | 'Resting'
): Promise<UserProfile> {
  const res = (await apiClient.patch(`/admin/roster/${id}/availability`, { availability_status: status })) as {
    success: boolean;
    data: { member: UserProfile };
  };
  return res.data.member;
}

// Backend: GET /admin/settings
export async function getAcademySettings(): Promise<AcademyAdminSettings> {
  const res = (await apiClient.get('/admin/settings')) as {
    success: boolean;
    data: { settings: AcademyAdminSettings };
  };
  return res.data.settings;
}

// Backend: PATCH /admin/settings
export async function updateAcademySettings(payload: {
  paystack_secret_key?: string;
  academy_name?: string;
  role_permissions?: AcademyAdminSettings['role_permissions'];
}): Promise<AcademyAdminSettings> {
  const res = (await apiClient.patch('/admin/settings', payload)) as {
    success: boolean;
    data: { settings: AcademyAdminSettings };
  };
  return res.data.settings;
}

// Backend: POST /admin/settings/logo
export async function uploadAcademyLogo(file: File): Promise<{ logo_url: string }> {
  const fd = new FormData();
  fd.append('logo', file);
  const res = (await apiClient.post('/admin/settings/logo', fd)) as {
    success: boolean;
    data: { logo_url: string };
  };
  return res.data;
}

export async function deleteMember(id: string): Promise<{ deleted: boolean }> {
  const res = (await apiClient.delete(`/admin/roster/${id}`)) as {
    success: boolean;
    data: { deleted: boolean };
  };
  return res.data;
}
