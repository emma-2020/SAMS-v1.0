// Shared `next/navigation` mock factory for smoke tests. Import via dynamic
// import inside a `vi.mock('next/navigation', async () => ...)` factory
// (see apiMock.ts for why dynamic import, not a plain top-level import).
import { vi } from 'vitest';

export function buildRouterMock() {
  return {
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  };
}

export function buildNavigationMock() {
  const router = buildRouterMock();
  return {
    useRouter: () => router,
    usePathname: () => '/',
    useSearchParams: () => new URLSearchParams(),
    redirect: vi.fn(),
  };
}
