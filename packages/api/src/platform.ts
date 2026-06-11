import { apiClient } from './client';

const PLATFORM_TOKEN_KEY = 'sams-platform-admin-token';

// ── Token helpers ─────────────────────────────────────────────────
export function getPlatformToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(PLATFORM_TOKEN_KEY);
}

export function setPlatformToken(token: string): void {
  localStorage.setItem(PLATFORM_TOKEN_KEY, token);
}

export function clearPlatformToken(): void {
  localStorage.removeItem(PLATFORM_TOKEN_KEY);
}

// ── Auth header for platform requests ────────────────────────────
function platformHeaders(): Record<string, string> {
  const token = getPlatformToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ── Types ─────────────────────────────────────────────────────────
export interface PlatformAdmin {
  id:    string;
  name:  string;
  email: string;
}

export interface EnrollmentRequest {
  id:                     string;
  academy_name:           string;
  contact_name:           string;
  contact_email:          string;
  sport?:                 string;
  estimated_players?:     number;
  message?:               string;
  status:                 'pending' | 'approved' | 'rejected';
  rejection_reason?:      string;
  reviewed_at?:           string;
  provisioned_academy_id?: string;
  created_at:             string;
  reviewer?:              PlatformAdmin;
}

export interface PlatformAcademy {
  id:           string;
  name:         string;
  is_active:    boolean;
  member_count: number;
  created_at:   string;
}

export interface PlatformStats {
  total_academies:     number;
  active_academies:    number;
  pending_requests:    number;
  approved_this_month: number;
  total_requests:      number;
}

// ── API calls ─────────────────────────────────────────────────────

export async function loginPlatform(email: string, password: string): Promise<{ token: string; admin: PlatformAdmin }> {
  const res = (await apiClient.post('/platform/login', { email, password })) as {
    success: boolean;
    data:    { token: string; admin: PlatformAdmin };
  };
  return res.data;
}

export async function getPlatformStats(): Promise<PlatformStats> {
  const res = (await apiClient.get('/platform/stats', { headers: platformHeaders() })) as {
    success: boolean;
    data:    PlatformStats;
  };
  return res.data;
}

export async function getEnrollmentRequests(status?: string): Promise<EnrollmentRequest[]> {
  const params = status ? { status } : {};
  const res = (await apiClient.get('/platform/requests', { params, headers: platformHeaders() })) as {
    success: boolean;
    data:    { requests: EnrollmentRequest[] };
  };
  return res.data.requests ?? [];
}

export async function getEnrollmentRequest(id: string): Promise<EnrollmentRequest> {
  const res = (await apiClient.get(`/platform/requests/${id}`, { headers: platformHeaders() })) as {
    success: boolean;
    data:    { request: EnrollmentRequest };
  };
  return res.data.request;
}

export async function approveEnrollmentRequest(id: string): Promise<{ academy: PlatformAcademy; message: string }> {
  const res = (await apiClient.post(`/platform/requests/${id}/approve`, {}, { headers: platformHeaders() })) as {
    success: boolean;
    data:    { academy: PlatformAcademy; message: string };
  };
  return res.data;
}

export async function rejectEnrollmentRequest(id: string, reason?: string): Promise<{ message: string }> {
  const res = (await apiClient.post(`/platform/requests/${id}/reject`, { reason }, { headers: platformHeaders() })) as {
    success: boolean;
    data:    { message: string };
  };
  return res.data;
}

export async function getPlatformAcademies(): Promise<PlatformAcademy[]> {
  const res = (await apiClient.get('/platform/academies', { headers: platformHeaders() })) as {
    success: boolean;
    data:    { academies: PlatformAcademy[] };
  };
  return res.data.academies ?? [];
}

export async function submitEnrollment(payload: {
  academy_name:      string;
  contact_name:      string;
  contact_email:     string;
  sport?:            string;
  estimated_players?: number;
  message?:          string;
}): Promise<{ message: string }> {
  const res = (await apiClient.post('/public/enroll', payload)) as {
    success: boolean;
    message: string;
  };
  return { message: res.message };
}
