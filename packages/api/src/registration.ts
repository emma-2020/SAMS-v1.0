import { apiClient } from './client';
import type { PlayerRegistration, RegistrationFormFields } from './types';

// ─── Player endpoints ─────────────────────────────────────────────────────────

export async function uploadDocument(file: File, docType: string): Promise<{ storage_path: string }> {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('docType', docType);
  const res = (await apiClient.post('/registration/upload', fd)) as {
    success: boolean;
    data: { storage_path: string };
  };
  return res.data;
}

export async function saveDraft(fields: Partial<RegistrationFormFields>): Promise<PlayerRegistration> {
  const res = (await apiClient.put('/registration/draft', fields)) as {
    success: boolean;
    data: { registration: PlayerRegistration };
  };
  return res.data.registration;
}

export async function submitRegistration(fields: RegistrationFormFields): Promise<PlayerRegistration> {
  const res = (await apiClient.post('/registration/submit', fields)) as {
    success: boolean;
    data: { registration: PlayerRegistration };
  };
  return res.data.registration;
}

export async function getMyRegistration(): Promise<PlayerRegistration | null> {
  const res = (await apiClient.get('/registration/me')) as {
    success: boolean;
    data: { registration: PlayerRegistration | null };
  };
  return res.data?.registration ?? null;
}

// ─── Admin endpoints ──────────────────────────────────────────────────────────

export async function getRegistrations(status?: string): Promise<PlayerRegistration[]> {
  const params = status ? `?status=${status}` : '';
  const res = (await apiClient.get(`/admin/registrations${params}`)) as {
    success: boolean;
    data: { registrations: PlayerRegistration[] };
  };
  return res.data?.registrations ?? [];
}

export async function getRegistration(id: string): Promise<PlayerRegistration> {
  const res = (await apiClient.get(`/admin/registrations/${id}`)) as {
    success: boolean;
    data: { registration: PlayerRegistration };
  };
  return res.data.registration;
}

export async function approveRegistration(id: string): Promise<PlayerRegistration> {
  const res = (await apiClient.patch(`/admin/registrations/${id}/approve`, {})) as {
    success: boolean;
    data: { registration: PlayerRegistration };
  };
  return res.data.registration;
}

export async function rejectRegistration(id: string, reason: string): Promise<PlayerRegistration> {
  const res = (await apiClient.patch(`/admin/registrations/${id}/reject`, { reason })) as {
    success: boolean;
    data: { registration: PlayerRegistration };
  };
  return res.data.registration;
}
