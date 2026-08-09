// Shared `@sams/api` mock factory for smoke tests.
//
// Every dashboard screen fires off several `*Api.getX()` calls on mount
// (see apps/next/CLAUDE.md investigation notes). Rather than hand-enumerate
// every method on every namespace (adminApi, coachApi, teamsApi, ...), each
// namespace is a Proxy that lazily vends a `vi.fn()` resolving to `[]` for
// *any* method name accessed. `[]` works as both a safe "empty list" result
// for calls consumed directly (e.g. `.then(setInvitations)`, no `?? []`
// fallback) and a safe "empty object" result for calls consumed via
// optional chaining (e.g. `summary?.outstandingFees ?? 0`), since `[]` is a
// non-null object with no matching properties.
//
// Use `buildApiMock()` from inside a `vi.mock('@sams/api', async () => ...)`
// factory (via dynamic import, to sidestep Vitest's hoisting of `vi.mock`
// above other imports). Grab the same `vi.fn` back out via the returned
// object to assert on / override individual calls per test.
import { vi } from 'vitest';

type AnyFn = (...args: unknown[]) => unknown;

function arrayResolvingNamespace(): Record<string, AnyFn> {
  const cache = new Map<string, AnyFn>();
  return new Proxy(
    {},
    {
      get(_target, prop: string) {
        if (!cache.has(prop)) {
          cache.set(prop, vi.fn(async () => []));
        }
        return cache.get(prop);
      },
    }
  ) as Record<string, AnyFn>;
}

export function buildApiMock() {
  return {
    apiClient: {
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    },
    configureApiClient: vi.fn(),
    OfflineQueuedError: class OfflineQueuedError extends Error {},
    subscribeOfflineQueue: vi.fn(() => () => {}),
    listQueuedMutations: vi.fn(async () => []),
    isOffline: vi.fn(() => false),
    onNetworkChange: vi.fn(() => () => {}),
    clearOfflineData: vi.fn(async () => {}),
    generateClientId: vi.fn(() => 'test-client-id'),
    recheckOfflineStateOnResume: vi.fn(),

    // Namespaced API surfaces — every method resolves to `[]` unless the
    // test overrides it (e.g. `(apiMock.authApi.login as Mock).mockResolvedValue(...)`).
    authApi: arrayResolvingNamespace(),
    adminApi: arrayResolvingNamespace(),
    coachApi: arrayResolvingNamespace(),
    teamsApi: arrayResolvingNamespace(),
    chatApi: arrayResolvingNamespace(),
    healthApi: arrayResolvingNamespace(),
    attendanceApi: arrayResolvingNamespace(),
    scheduleApi: arrayResolvingNamespace(),
    workoutApi: arrayResolvingNamespace(),
    notificationsApi: arrayResolvingNamespace(),
    platformApi: arrayResolvingNamespace(),
    feesApi: arrayResolvingNamespace(),
    documentsApi: arrayResolvingNamespace(),
    announcementsApi: arrayResolvingNamespace(),
    analyticsApi: arrayResolvingNamespace(),
    registrationApi: arrayResolvingNamespace(),
    meetingsApi: arrayResolvingNamespace(),
  };
}
