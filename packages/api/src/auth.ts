import { apiClient } from './client';
import type { Session, UserProfile } from './types';

interface LoginPayload {
  email: string;
  password: string;
  academy_id: string;
}

interface LoginResponse {
  session: Session;
  profile: UserProfile;
}

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  const res = (await apiClient.post('/auth/login', payload)) as { success: boolean; data: LoginResponse };
  return res.data;
}

export async function logout(): Promise<void> {
  await apiClient.post('/auth/logout');
}

export async function me(): Promise<{ profile: UserProfile }> {
  const res = (await apiClient.get('/auth/me')) as { success: boolean; data: { profile: UserProfile } };
  return res.data;
}

export async function refreshSession(refresh_token: string): Promise<Session> {
  const res = (await apiClient.post('/auth/refresh', { refresh_token })) as {
    success: boolean;
    data: { session: Session };
  };
  return res.data.session;
}

export interface InviteDetails {
  email: string;
  role: string;
  first_name: string;
  last_name: string;
  academy_id: string;
  academy_name: string;
  expires_at: string;
}

export async function validateInvite(token: string): Promise<{ invite: InviteDetails }> {
  const res = (await apiClient.get(`/auth/invite/${token}`)) as { success: boolean; data: { invite: InviteDetails } };
  return res.data;
}

export async function register(payload: { token: string; password: string }): Promise<LoginResponse> {
  const res = (await apiClient.post('/auth/register', payload)) as { success: boolean; data: LoginResponse };
  return res.data;
}

export async function setupAccount(payload: {
  token: string;
  password: string;
}): Promise<LoginResponse> {
  const res = (await apiClient.post('/auth/setup-account', payload)) as { success: boolean; data: LoginResponse };
  return res.data;
}

export async function forgotPassword(email: string): Promise<void> {
  await apiClient.post('/auth/forgot-password', { email });
}

export async function resetPassword(payload: {
  access_token: string;
  new_password: string;
}): Promise<void> {
  await apiClient.post('/auth/reset-password', payload);
}

export async function updateProfile(payload: { first_name?: string; last_name?: string }): Promise<UserProfile> {
  const res = (await apiClient.patch('/auth/me', payload)) as { success: boolean; data: { profile: UserProfile } };
  return res.data.profile;
}

// POST /auth/avatar — multipart/form-data with field "avatar"
// Content-Type is removed by the apiClient interceptor so the browser sets
// multipart/form-data with the correct boundary automatically.
export async function uploadAvatar(file: File): Promise<UserProfile> {
  const fd = new FormData();
  fd.append('avatar', file);
  const res = (await apiClient.post('/auth/avatar', fd)) as { success: boolean; data: { profile: UserProfile } };
  return res.data.profile;
}

export async function getPreferences(): Promise<import('./types').UserPreferences> {
  const res = (await apiClient.get('/auth/preferences')) as {
    success: boolean;
    data: { preferences: import('./types').UserPreferences };
  };
  return res.data?.preferences ?? {};
}

export async function updatePreferences(
  patch: import('./types').UserPreferences
): Promise<import('./types').UserPreferences> {
  const res = (await apiClient.patch('/auth/preferences', patch)) as {
    success: boolean;
    data: { preferences: import('./types').UserPreferences };
  };
  return res.data?.preferences ?? {};
}
