// Shared test fixtures for auth session / profile objects.
// Field shapes must track packages/api/src/types.ts (`Session`, `UserProfile`)
// — check there before adding fields here.
import type { Session, UserProfile } from '@sams/api';

export function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    access_token: 'test-access-token',
    refresh_token: 'test-refresh-token',
    expires_in: 3600,
    token_type: 'bearer',
    ...overrides,
  };
}

export function makeProfile(
  role: UserProfile['role'],
  overrides: Partial<UserProfile> = {}
): UserProfile {
  return {
    id: 'user-1',
    academy_id: 'academy-1',
    email: 'test@example.com',
    role,
    first_name: 'Test',
    last_name: 'User',
    ...overrides,
  };
}
