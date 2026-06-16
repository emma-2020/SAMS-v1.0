import axios, { type InternalAxiosRequestConfig } from 'axios';

// Resolved at runtime so it works in Next.js (server + client) and Expo
function resolveBaseUrl(): string {
  if (typeof process !== 'undefined') {
    if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
    if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;
  }

  // No env var was set. That's a legitimate local-dev fallback when the
  // browser itself is on localhost, but if the page is being served from a
  // real deployed origin it means NEXT_PUBLIC_API_URL was missing from the
  // build — every request would silently target http://localhost:4000
  // inside the visitor's own browser (nothing listens there, and https
  // pages block http:// as mixed content), surfacing only as an opaque
  // "Network Error" with no indication of the real cause. Fail loudly here
  // instead.
  if (typeof window !== 'undefined' && window.location) {
    const host = window.location.hostname;
    if (host !== 'localhost' && host !== '127.0.0.1') {
      throw new Error(
        `NEXT_PUBLIC_API_URL is not set. Refusing to fall back to http://localhost:4000 ` +
          `on a deployed origin (${window.location.origin}) — set NEXT_PUBLIC_API_URL in the ` +
          `hosting provider's environment variables and redeploy.`
      );
    }
  }

  return 'http://localhost:4000';
}

type TokenGetter = () => string | null;
type UnauthorizedHandler = (expiredToken?: string) => void;
type RefreshHandler = () => Promise<string | null>;

let _getToken: TokenGetter = () => null;
let _onUnauthorized: UnauthorizedHandler = () => {};
let _refresh: RefreshHandler = async () => null;
let _isRefreshing = false;
let _queue: Array<{ resolve: (t: string) => void; reject: (e: Error) => void }> = [];

export function configureApiClient(opts: {
  getToken: TokenGetter;
  refresh: RefreshHandler;
  onUnauthorized: UnauthorizedHandler;
}) {
  _getToken = opts.getToken;
  _refresh = opts.refresh;
  _onUnauthorized = opts.onUnauthorized;
}

export const apiClient = axios.create({
  baseURL: `${resolveBaseUrl()}/api`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15_000,
});

// Attach bearer token on every request — but only when the caller hasn't
// already supplied its own Authorization header (e.g. platform API calls).
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = _getToken();
  if (token && !config.headers.Authorization) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Single-attempt refresh queue on 401 — mirrors the existing CRA pattern.
// Only retry requests that actually sent a Bearer token; login/register/refresh
// endpoints return 401 for legitimate reasons (wrong password, expired refresh
// token) and must never trigger the refresh-and-retry path, otherwise
// _onUnauthorized() fires a spurious router.replace('/login') that remounts
// the login page and silently wipes the error state before the user can see it.
apiClient.interceptors.response.use(
  (res) => res.data,
  async (err) => {
    const original = err.config;
    const authHeader = (original?.headers?.Authorization as string | undefined) ?? '';
    const hadBearerToken = authHeader.startsWith('Bearer ');
    const expiredToken = hadBearerToken ? authHeader.slice(7) : '';
    if (err.response?.status === 401 && !original._retry && hadBearerToken) {
      if (_isRefreshing) {
        return new Promise((resolve, reject) => {
          _queue.push({ resolve, reject });
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return apiClient(original);
        });
      }
      original._retry = true;
      _isRefreshing = true;
      try {
        const token = await _refresh();
        if (token) {
          _queue.forEach((p) => p.resolve(token));
          _queue = [];
          original.headers.Authorization = `Bearer ${token}`;
          return apiClient(original);
        }
      } catch (_) {
        // Refresh threw — fall through to drain queue and unauthorize
      } finally {
        _isRefreshing = false;
      }
      _queue.forEach((p) => p.reject(new Error('Session expired')));
      _queue = [];
      _onUnauthorized(expiredToken);
    }
    const message = err.response?.data?.error ?? err.message ?? 'Request failed';
    throw new Error(message);
  }
);
