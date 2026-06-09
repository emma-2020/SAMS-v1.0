'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@sams/store';
import { authApi, configureApiClient } from '@sams/api';
import { ROLE_DASHBOARD } from '@sams/app';

/**
 * Mounts at the root layout. On every app load:
 * 1. Wires the token getter and refresh handler into the API client
 * 2. Calls GET /api/auth/me to revalidate the persisted session
 * 3. Only calls logout() on a confirmed 401 — mirrors AuthProvider.jsx behaviour
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { session, isInitialised, login, logout, refreshSession, setInitialised } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  // Wire API client synchronously on every render so it survives Fast Refresh
  // in development and is always ready before child effects fire API calls.
  configureApiClient({
    getToken: () => useAuthStore.getState().session?.access_token ?? null,
    refresh: async () => {
      const rt = useAuthStore.getState().session?.refresh_token;
      if (!rt) return null;
      try {
        const newSession = await authApi.refreshSession(rt);
        useAuthStore.getState().refreshSession(newSession);
        return newSession.access_token;
      } catch {
        return null;
      }
    },
    onUnauthorized: (expiredToken?: string) => {
      // Guard against a race condition: AuthProvider.validate() fires GET /api/auth/me
      // with a stale cached token on app mount. If the user logs in with fresh credentials
      // before that background 401 resolves, the new session must not be wiped.
      // Only act if the token that expired is still the current active token.
      const currentToken = useAuthStore.getState().session?.access_token;
      if (expiredToken && currentToken && currentToken !== expiredToken) return;
      useAuthStore.getState().logout();
      router.replace('/login');
    },
  });

  // Revalidate persisted session on mount
  useEffect(() => {
    if (isInitialised) return;

    const validate = async () => {
      if (!session?.access_token) {
        setInitialised();
        return;
      }
      try {
        const { profile } = await authApi.me();
        login(session, profile);
      } catch (err: unknown) {
        if (err instanceof Error && err.message.includes('401')) {
          logout();
        }
        // Network/500 errors: keep the cached session, don't force logout
      } finally {
        setInitialised();
      }
    };

    validate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <>{children}</>;
}

/**
 * Client component that enforces auth on protected routes.
 * Redirects unauthenticated users to /login, preserving the attempted path.
 */
export function ProtectedGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isInitialised } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isInitialised) return;
    if (!isAuthenticated) {
      router.replace(`/login?from=${encodeURIComponent(pathname)}`);
    }
  }, [isInitialised, isAuthenticated, pathname, router]);

  if (!isInitialised) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid #E2E8F0', borderTopColor: '#6366F1', animation: 'spin 0.7s linear infinite' }} />
      </div>
    );
  }

  if (!isAuthenticated) return null;
  return <>{children}</>;
}

/**
 * Redirects authenticated users away from /login and /register.
 * Renders the form immediately so users are never blocked by the session check.
 * If an existing session is valid, the redirect fires once isInitialised flips.
 */
export function PublicOnlyGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isInitialised, user } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isInitialised) return;
    if (!isAuthenticated || !user) return;
    router.replace(ROLE_DASHBOARD[user.role] ?? '/dashboard');
  }, [isInitialised, isAuthenticated, user, router]);

  // Hide the form only when we know for certain the user is already signed in.
  if (isInitialised && isAuthenticated) return null;

  return <>{children}</>;
}
