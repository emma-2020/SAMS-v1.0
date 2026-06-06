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

export async function validateInvite(token: string): Promise<{
  invitation: { email: string; role: string; first_name?: string };
}> {
  const res = (await apiClient.get(`/auth/invite/${token}`)) as { success: boolean; data: unknown };
  return res.data as { invitation: { email: string; role: string; first_name?: string } };
}

export async function register(payload: {
  token: string;
  first_name: string;
  last_name: string;
  email: string;
  password: string;
}): Promise<LoginResponse> {
  const res = (await apiClient.post('/auth/register', payload)) as { success: boolean; data: LoginResponse };
  return res.data;
}
