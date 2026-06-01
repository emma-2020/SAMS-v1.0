// src/store/authStore.js
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * SAMS Auth Store — Zustand
 * ─────────────────────────
 * IMPORTANT: JavaScript property getters (get accessToken() {...}) are NOT
 * used here. When Zustand's set() merges state via object spread, property
 * getters are evaluated immediately and frozen as plain values — meaning
 * accessToken would always be null even after login sets the real session.
 *
 * Instead, all consumers read session and user directly from the store:
 *   const { session, user } = useAuthStore.getState();
 *   const token = session?.access_token;
 */

const useAuthStore = create(
  persist(
    (set) => ({
      // ── State ─────────────────────────────────────────────────
      session:         null,   // { access_token, refresh_token, expires_in, token_type }
      user:            null,   // { id, academy_id, email, role, first_name, last_name }
      isAuthenticated: false,
      isLoading:       false,
      isInitialised:   false,
      error:           null,

      // ── Actions ───────────────────────────────────────────────

      login: (session, profile) => {
        set({
          session,
          user:            profile,
          isAuthenticated: true,
          isLoading:       false,
          error:           null,
        });
      },

      logout: () => {
        set({
          session:         null,
          user:            null,
          isAuthenticated: false,
          isLoading:       false,
          error:           null,
        });
      },

      refreshSession: (newSession) => {
        set({ session: newSession });
      },

      setUser:        (profile)   => set({ user: profile }),
      setLoading:     (isLoading) => set({ isLoading }),
      setError:       (error)     => set({ error }),
      setInitialised: ()          => set({ isInitialised: true }),
      clearError:     ()          => set({ error: null }),
    }),
    {
      name:    'sams_auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        session:         state.session,
        user:            state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export default useAuthStore;
