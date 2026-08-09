// Shared `@sams/store` mock factory for smoke tests.
//
// The real store is zustand-backed. The root package.json's pnpm.overrides
// pin `@sams/store`'s own "react" resolution to 18.2.0, a *different*
// physical copy from apps/next's own react@18.3.1 that react-dom renders
// with here. Real Next.js builds don't visibly break (webpack's resolution
// converges them), but under Vitest, zustand's `useSyncExternalStore` call
// ends up bound to the *other* React copy, breaking hooks ("Cannot read
// properties of null (reading 'useRef')") — see CLAUDE.md investigation
// notes and packages/store/src/auth.ts's "no getters" comment for the
// underlying store shape this mirrors.
//
// Rather than fight pnpm's resolution graph from vitest.config.ts, this
// reimplements the same tiny store surface (state + the actions dashboards
// call) with React's own `useSyncExternalStore`, imported from 'react'
// directly so it's guaranteed to be the single copy already loaded here.
import { useSyncExternalStore } from 'react';
import type { AuthStore } from '@sams/store';

type Listener = () => void;

function createMockAuthStore() {
  const listeners = new Set<Listener>();
  let state: AuthStore;

  const setState = (partial: Partial<AuthStore>) => {
    state = { ...state, ...partial };
    listeners.forEach((listener) => listener());
  };

  const getState = () => state;

  const subscribe = (listener: Listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  state = {
    session: null,
    user: null,
    isAuthenticated: false,
    isLoading: false,
    isInitialised: false,
    error: null,
    login: (session, profile) =>
      setState({ session, user: profile, isAuthenticated: true, isLoading: false, error: null }),
    logout: () =>
      setState({ session: null, user: null, isAuthenticated: false, isLoading: false, error: null }),
    refreshSession: (newSession) => setState({ session: newSession }),
    setUser: (profile) => setState({ user: profile }),
    setLoading: (isLoading) => setState({ isLoading }),
    setError: (error) => setState({ error }),
    setInitialised: () => setState({ isInitialised: true }),
    clearError: () => setState({ error: null }),
  };

  function useAuthStore<T>(selector: (s: AuthStore) => T): T {
    return useSyncExternalStore(
      subscribe,
      () => selector(getState()),
      () => selector(getState())
    );
  }

  return Object.assign(useAuthStore, { getState, setState, subscribe });
}

export function buildStoreMock() {
  return { useAuthStore: createMockAuthStore() };
}
