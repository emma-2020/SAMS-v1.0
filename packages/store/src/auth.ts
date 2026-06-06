import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';
import type { Session, UserProfile } from '@sams/api';

/**
 * Cross-platform storage resolver.
 * Web: localStorage  |  Native: @react-native-async-storage/async-storage
 *
 * IMPORTANT: Zustand property getters must NOT be used here.
 * When set() merges state via spread, getters evaluate immediately and freeze.
 * Always read session.access_token directly from getState().session.
 */
function resolveStorage(): StateStorage {
  if (typeof window !== 'undefined' && window.localStorage) {
    return localStorage;
  }
  // React Native path — require at runtime so the web bundle never pulls it in
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const AsyncStorage = require('@react-native-async-storage/async-storage').default as StateStorage;
    return AsyncStorage;
  } catch {
    // Fallback in-memory storage (SSR, test environments)
    const map = new Map<string, string>();
    return {
      getItem: (key) => map.get(key) ?? null,
      setItem: (key, value) => { map.set(key, value); },
      removeItem: (key) => { map.delete(key); },
    };
  }
}

export interface AuthState {
  session: Session | null;
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialised: boolean;
  error: string | null;
}

export interface AuthActions {
  login: (session: Session, profile: UserProfile) => void;
  logout: () => void;
  refreshSession: (newSession: Session) => void;
  setUser: (profile: UserProfile) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  setInitialised: () => void;
  clearError: () => void;
}

export type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      // ── State
      session: null,
      user: null,
      isAuthenticated: false,
      isLoading: false,
      isInitialised: false,
      error: null,

      // ── Actions
      login: (session, profile) =>
        set({ session, user: profile, isAuthenticated: true, isLoading: false, error: null }),

      logout: () =>
        set({ session: null, user: null, isAuthenticated: false, isLoading: false, error: null }),

      refreshSession: (newSession) => set({ session: newSession }),

      setUser: (profile) => set({ user: profile }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      setInitialised: () => set({ isInitialised: true }),
      clearError: () => set({ error: null }),
    }),
    {
      name: 'sams_auth',
      storage: createJSONStorage(resolveStorage),
      partialize: (state) => ({
        session: state.session,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
