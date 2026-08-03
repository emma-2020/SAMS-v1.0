// tests/unit/services/auth.service.test.js
'use strict';

jest.mock('../../src/config/supabase');

const { supabaseAdmin, supabaseAnon } = require('../../src/config/supabase');
const authService        = require('../../src/services/auth.service');
const { ConflictError, UnauthorizedError, NotFoundError, BadRequestError } =
  require('../../src/utils/errors');

// ─── Supabase chain mock builder ──────────────────────────────────

function mockChain(returnValue) {
  const terminal = jest.fn().mockResolvedValue(returnValue);
  const handler  = {
    select:      jest.fn(),
    insert:      jest.fn(),
    eq:          jest.fn(),
    single:      terminal,
    maybeSingle: terminal,
  };
  // Each builder method returns the same handler (chainable)
  Object.keys(handler).forEach((k) => {
    if (k !== 'single' && k !== 'maybeSingle') {
      handler[k].mockReturnValue(handler);
    }
  });
  return handler;
}

// ─────────────────────────────────────────────────────────────────
// LOGIN TESTS
// ─────────────────────────────────────────────────────────────────

describe('authService.login', () => {

  const credentials = {
    email:      'marcus@riverside.com',
    password:   'CoachPass99!',
    academy_id: 'acad-uuid-001',
  };

  // ── Validation ──────────────────────────────────────────────────

  test('throws BadRequestError when email is missing', async () => {
    await expect(authService.login({ ...credentials, email: '' }))
      .rejects.toBeInstanceOf(BadRequestError);
  });

  test('throws BadRequestError when password is absent', async () => {
    await expect(authService.login({ ...credentials, password: undefined }))
      .rejects.toBeInstanceOf(BadRequestError);
  });

  // ── Auth failure ───────────────────────────────────────────────

  test('throws UnauthorizedError on wrong credentials', async () => {
    supabaseAnon.auth = {
      signInWithPassword: jest.fn().mockResolvedValue({
        data: { session: null }, error: { message: 'Invalid login credentials' },
      }),
    };

    await expect(authService.login(credentials))
      .rejects.toBeInstanceOf(UnauthorizedError);
  });

  test('error message is deliberately vague — does not reveal email vs password', async () => {
    supabaseAnon.auth = {
      signInWithPassword: jest.fn().mockResolvedValue({
        data: { session: null }, error: { message: 'Invalid login credentials' },
      }),
    };

    try {
      await authService.login(credentials);
      throw new Error('expected authService.login to reject');
    } catch (err) {
      // Deliberately vague: the same generic message is used whether the email
      // or the password was wrong, so a caller can't enumerate valid emails by
      // comparing error text. (A message that says "email or password" together
      // necessarily contains both words — that's the point, not a leak.)
      expect(err.message).toMatch(/invalid email or password/i);
    }
  });

  // ── Tenant guard ───────────────────────────────────────────────

  test('throws UnauthorizedError when user does not belong to the requested academy', async () => {
    supabaseAnon.auth = {
      signInWithPassword: jest.fn().mockResolvedValue({
        data: {
          user:    { id: 'u1' },
          session: { access_token: 'tok', refresh_token: 'ref', expires_in: 3600 },
        },
        error: null,
      }),
    };

    // Profile query returns null — cross-tenant attempt
    supabaseAdmin.from = jest.fn().mockReturnValue(
      mockChain({ data: null, error: { message: 'Not found' } })
    );

    await expect(authService.login(credentials))
      .rejects.toBeInstanceOf(UnauthorizedError);
  });

  // ── Happy path ─────────────────────────────────────────────────

  test('returns session tokens and safe profile on success', async () => {
    supabaseAnon.auth = {
      signInWithPassword: jest.fn().mockResolvedValue({
        data: {
          user:    { id: 'u1' },
          session: { access_token: 'access.tok', refresh_token: 'refresh.tok', expires_in: 3600 },
        },
        error: null,
      }),
    };

    supabaseAdmin.from = jest.fn().mockReturnValue(
      mockChain({
        data: {
          id: 'u1', academy_id: 'acad-uuid-001', email: 'marcus@riverside.com',
          role: 'Coach', first_name: 'Marcus', last_name: 'Reyes',
          created_at: '2026-01-01T00:00:00Z', is_active: true,
        },
        error: null,
      })
    );

    const result = await authService.login(credentials);

    expect(result.session.access_token).toBe('access.tok');
    expect(result.session.token_type).toBe('Bearer');
    expect(result.profile.role).toBe('Coach');
    expect(result.profile).not.toHaveProperty('is_active');   // stripped
    expect(result.profile).not.toHaveProperty('password_hash');
  });

  // ── Deactivated account ────────────────────────────────────────

  test('throws UnauthorizedError when account is_active = false', async () => {
    supabaseAnon.auth = {
      signInWithPassword: jest.fn().mockResolvedValue({
        data: {
          user:    { id: 'u1' },
          session: { access_token: 'tok', refresh_token: 'ref', expires_in: 3600 },
        },
        error: null,
      }),
    };

    supabaseAdmin.from = jest.fn().mockReturnValue(
      mockChain({
        data: {
          id: 'u1', academy_id: 'acad-uuid-001', email: 'x@x.com',
          role: 'Player', first_name: 'A', last_name: 'B',
          created_at: '2026-01-01T00:00:00Z', is_active: false,
        },
        error: null,
      })
    );

    await expect(authService.login(credentials))
      .rejects.toBeInstanceOf(UnauthorizedError);
  });
});

// ─────────────────────────────────────────────────────────────────
// RESET PASSWORD TESTS
// ─────────────────────────────────────────────────────────────────

describe('authService.resetPassword', () => {

  const validToken    = 'recovery-access-token';
  const validPassword = 'NewSecurePass1!';

  // ── Regression: validatePasswordChange must receive the raw string,
  //    not an object — a strong password must not be rejected as "required".
  test('does not reject a valid strong password as missing', async () => {
    supabaseAdmin.auth = {
      getUser: jest.fn().mockResolvedValue({
        data:  { user: { id: 'u1', email: 'jordan@riverside.com' } },
        error: null,
      }),
      admin: {
        updateUserById: jest.fn().mockResolvedValue({ error: null }),
      },
    };

    await expect(authService.resetPassword(validToken, validPassword))
      .resolves.toBeUndefined();

    expect(supabaseAdmin.auth.admin.updateUserById).toHaveBeenCalledWith(
      'u1',
      { password: validPassword }
    );
  });

  test('throws BadRequestError when the new password is too weak', async () => {
    await expect(authService.resetPassword(validToken, 'weak'))
      .rejects.toBeInstanceOf(BadRequestError);
  });

  test('throws UnauthorizedError when the recovery token is invalid or expired', async () => {
    supabaseAdmin.auth = {
      getUser: jest.fn().mockResolvedValue({
        data:  { user: null },
        error: { message: 'invalid token' },
      }),
    };

    await expect(authService.resetPassword('bad-token', validPassword))
      .rejects.toBeInstanceOf(UnauthorizedError);
  });
});
