// src/services/auth.api.js
import api from './api';

/**
 * Auth API Service
 * ─────────────────
 * Thin wrappers around the auth REST endpoints.
 * Return the `data` payload directly — error handling is done in components.
 */

/**
 * login
 * POST /api/auth/login
 * @returns {{ session, profile }}
 */
export async function login({ email, password, academy_id }) {
  const res = await api.post('/auth/login', { email, password, academy_id });
  return res.data.data;   // { session: { access_token, ... }, profile: { ... } }
}

/**
 * logout
 * POST /api/auth/logout  (token injected automatically by interceptor)
 */
export async function logout() {
  try {
    await api.post('/auth/logout');
  } catch {
    // Ignore logout API failures — store is cleared regardless
  }
}

/**
 * getMe
 * GET /api/auth/me  — verifies and refreshes the stored profile
 * @returns {profile}
 */
export async function getMe() {
  const res = await api.get('/auth/me');
  return res.data.data.profile;
}

/**
 * verifyInviteToken
 * GET /api/auth/invite/:token — validates an invitation token
 * @returns {{ email, first_name, last_name, role, academy_id, academy_name, expires_at }}
 */
export async function verifyInviteToken(token) {
  const res = await api.get(`/auth/invite/${token}`);
  return res.data.data.invite;
}

/**
 * registerByInvitation
 * POST /api/auth/register — creates account from invitation token
 * @returns {{ session, profile }}
 */
export async function registerByInvitation({ token, password }) {
  const res = await api.post('/auth/register', { token, password });
  return res.data.data;
}

/**
 * uploadAvatar
 * POST /api/auth/avatar — uploads a profile picture, returns updated profile
 * @param {File} file
 * @returns {profile}
 */
export async function uploadAvatar(file) {
  const form = new FormData();
  form.append('avatar', file);
  const res = await api.post('/auth/avatar', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.data.profile;
}
