// src/context/AuthProvider.jsx
import { useEffect } from 'react';
import useAuthStore from '../store/authStore';
import { getMe } from '../services/auth.api';

/**
 * AuthProvider
 * ─────────────
 * On initial load, validates the persisted session by calling
 * GET /api/auth/me.
 *
 * IMPORTANT: Only calls logout() on a definitive 401 Unauthorized.
 * Network errors or server errors (500) do NOT log the user out —
 * they might just be temporary. This prevents the silent
 * "flicker back to login" bug caused by a failing /me request.
 */
export default function AuthProvider({ children }) {
  const { isAuthenticated, setUser, logout, setInitialised, setLoading } =
    useAuthStore();

  useEffect(() => {
    async function restoreSession() {
      if (!isAuthenticated) {
        setInitialised();
        return;
      }

      setLoading(true);
      try {
        const profile = await getMe();
        setUser(profile);
      } catch (err) {
        // Only logout on a confirmed 401 — token is definitively invalid.
        // Any other error (network down, server error, missing column) keeps
        // the session alive so the user isn't silently kicked back to login.
        if (err.status === 401) {
          logout();
        }
        // For all other errors: leave isAuthenticated = true so the user
        // can still see the app. The next API call will re-validate.
      } finally {
        setLoading(false);
        setInitialised();
      }
    }

    restoreSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return children;
}
