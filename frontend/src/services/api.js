// src/services/api.js
import axios from 'axios';
import useAuthStore from '../store/authStore';

/**
 * Axios API Client
 * ─────────────────
 * IMPORTANT: Reads session.access_token directly from the store,
 * NOT via the accessToken getter (which was frozen as null by Zustand's
 * object spread during state merges).
 */

const api = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// ── Request: attach Bearer token ─────────────────────────────────
api.interceptors.request.use(
  (config) => {
    // Read directly from session — never use the getter
    const { session } = useAuthStore.getState();
    const token = session?.access_token ?? null;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response: handle 401 with one token refresh attempt ──────────

let isRefreshing = false;
let refreshQueue = [];

function processQueue(error, token = null) {
  refreshQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token)));
  refreshQueue = [];
}

function normaliseError(error) {
  return {
    message: error.response?.data?.error
           || error.response?.data?.message
           || error.message
           || 'An unexpected error occurred.',
    status:  error.response?.status ?? null,
    data:    error.response?.data   ?? null,
  };
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    const isAuthRoute = original?.url?.includes('/auth/login')
                     || original?.url?.includes('/auth/refresh')
                     || original?.url?.includes('/auth/signup');

    if (error.response?.status === 401 && !original?._retry && !isAuthRoute) {
      // Read refresh token directly — never use the getter
      const { session } = useAuthStore.getState();
      const refreshToken = session?.refresh_token ?? null;

      if (!refreshToken) {
        useAuthStore.getState().logout();
        return Promise.reject(normaliseError(error));
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return api(original);
        });
      }

      original._retry = true;
      isRefreshing    = true;

      try {
        const { data } = await axios.post(
          `${process.env.REACT_APP_API_BASE_URL || '/api'}/auth/refresh`,
          { refresh_token: refreshToken }
        );
        const newSession = data.data.session;
        useAuthStore.getState().refreshSession(newSession);
        processQueue(null, newSession.access_token);
        original.headers.Authorization = `Bearer ${newSession.access_token}`;
        return api(original);
      } catch (refreshError) {
        processQueue(refreshError, null);
        if (refreshError.response?.status === 401) {
          useAuthStore.getState().logout();
        }
        return Promise.reject(normaliseError(refreshError));
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(normaliseError(error));
  }
);

export default api;
