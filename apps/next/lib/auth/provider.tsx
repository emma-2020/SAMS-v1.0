'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@sams/store';
import { authApi, configureApiClient } from '@sams/api';
import { ROLE_DASHBOARD } from '@sams/app';
import { useInactivityLogout } from './useInactivityLogout';
import { useNativeConnectivityResume } from './useNativeConnectivityResume';

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

  useInactivityLogout();
  useNativeConnectivityResume();

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
      // Platform routes manage their own auth — never redirect them to the tenant login.
      if (pathname.startsWith('/platform')) return;
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

    // Platform routes use their own token (sams-platform-admin-token) and their
    // own layout guard. Running the tenant /me check here would send the tenant
    // JWT to /api/auth/me, get a 401, and incorrectly fire onUnauthorized.
    if (pathname.startsWith('/platform')) {
      setInitialised();
      return;
    }

    const validate = async () => {
      if (!session?.access_token) {
        setInitialised();
        return;
      }
      try {
        const { profile } = await authApi.me();
        login(session, profile);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message.toLowerCase() : '';
        // Treat any auth-rejection as a sign the token is dead.
        // The backend sends "Token is invalid or has expired.", "Authorization
        // header missing or malformed.", or "Not authenticated." — none contain
        // the literal string "401", so we match on keywords instead.
        const isAuthError = msg.includes('401') || msg.includes('invalid') ||
          msg.includes('expired') || msg.includes('unauthorized') ||
          msg.includes('unauthorised') || msg.includes('not authenticated') ||
          msg.includes('authorization') || msg.includes('session expired');
        if (isAuthError) logout();
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
 *
 * Renders children immediately when a cached session exists in the store so
 * page-level data fetches start in parallel with the background /me check,
 * eliminating the auth-gate → data-fetch sequential waterfall.
 * If the token is stale the onUnauthorized handler in AuthProvider redirects.
 */
export function ProtectedGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isInitialised, session } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isInitialised) return;
    if (!isAuthenticated) {
      router.replace(`/login?from=${encodeURIComponent(pathname)}`);
    }
  }, [isInitialised, isAuthenticated, pathname, router]);

  // If a persisted session exists, render the app immediately instead of
  // blocking behind the /me round-trip. The background auth check still runs;
  // an expired token will hit onUnauthorized and redirect to /login.
  const hasCachedSession = !!session?.access_token;

  if (!isInitialised && !hasCachedSession) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid #E2E8F0', borderTopColor: '#6366F1', animation: 'spin 0.7s linear infinite' }} />
      </div>
    );
  }

  if (isInitialised && !isAuthenticated) return null;
  return <>{children}</>;
}

/**
 * Redirects authenticated users away from /login and /register.
 * Renders the form immediately so users are never blocked by the session check.
 * If an existing session is valid, the redirect fires once isInitialised flips.
 */
export function PublicOnlyGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isInitialised, user, session } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isInitialised) return;
    if (!isAuthenticated || !user) return;
    router.replace(ROLE_DASHBOARD[user.role] ?? '/dashboard');
  }, [isInitialised, isAuthenticated, user, router]);

  // Suppress the login form while a cached session is being validated to prevent
  // a flash of the login UI before the redirect fires.
  if (!isInitialised && session?.access_token) return null;
  if (isInitialised && isAuthenticated) return null;

  return <>{children}</>;
}
