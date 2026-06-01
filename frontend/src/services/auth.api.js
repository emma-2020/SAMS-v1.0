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
