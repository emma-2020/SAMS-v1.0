// tests/unit/services/auth.service.test.js
'use strict';

jest.mock('../../src/config/supabase');

const { supabaseAdmin }  = require('../../src/config/supabase');
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
// SIGNUP TESTS
// ─────────────────────────────────────────────────────────────────

describe('authService.signup', () => {

  const validPayload = {
    email:      'jordan@riverside.com',
    password:   'SecurePass1!',
    role:       'Player',
    first_name: 'Jordan',
    last_name:  'Ellis',
    academy_id: 'acad-uuid-001',
  };

  // ── Validation ──────────────────────────────────────────────────

  test('throws BadRequestError when email is missing', async () => {
    await expect(authService.signup({ ...validPayload, email: '' }))
      .rejects.toBeInstanceOf(BadRequestError);
  });

  test('throws BadRequestError when email format is invalid', async () => {
    await expect(authService.signup({ ...validPayload, email: 'not-an-email' }))
      .rejects.toBeInstanceOf(BadRequestError);
  });

  test('throws BadRequestError when password is too short', async () => {
    await expect(authService.signup({ ...validPayload, password: 'short' }))
      .rejects.toBeInstanceOf(BadRequestError);
  });

  test('throws BadRequestError when role is invalid', async () => {
    await expect(authService.signup({ ...validPayload, role: 'Superuser' }))
      .rejects.toBeInstanceOf(BadRequestError);
  });

  test('throws BadRequestError when first_name is empty', async () => {
    await expect(authService.signup({ ...validPayload, first_name: '' }))
      .rejects.toBeInstanceOf(BadRequestError);
  });

  // ── Academy validation ──────────────────────────────────────────

  test('throws NotFoundError when academy does not exist', async () => {
    supabaseAdmin.from = jest.fn().mockReturnValue(
      mockChain({ data: null, error: { message: 'Not found' } })
    );

    await expect(authService.signup(validPayload))
      .rejects.toBeInstanceOf(NotFoundError);
  });

  // ── Conflict detection ─────────────────────────────────────────

  test('throws ConflictError when email already registered in this academy', async () => {
    let callCount = 0;
    supabaseAdmin.from = jest.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // Academy lookup — found
        return mockChain({ data: { id: 'acad-uuid-001' }, error: null });
      }
      // User lookup — already exists
      return mockChain({ data: { id: 'existing-user' }, error: null });
    });

    await expect(authService.signup(validPayload))
      .rejects.toBeInstanceOf(ConflictError);
  });

  // ── Auth user creation failure ─────────────────────────────────

  test('throws InternalError and does not create profile if auth.admin.createUser fails', async () => {
    let callCount = 0;
    supabaseAdmin.from = jest.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) return mockChain({ data: { id: 'acad-uuid-001' }, error: null });
      return mockChain({ data: null, error: null });  // no existing user
    });

    supabaseAdmin.auth = {
      admin: {
        createUser:  jest.fn().mockResolvedValue({ data: null, error: { message: 'Auth error' } }),
        deleteUser:  jest.fn().mockResolvedValue({}),
      },
    };

    const { InternalError } = require('../../../src/utils/errors');
    await expect(authService.signup(validPayload))
      .rejects.toBeInstanceOf(InternalError);
  });
});

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
    supabaseAdmin.auth = {
      signInWithPassword: jest.fn().mockResolvedValue({
        data: { session: null }, error: { message: 'Invalid login credentials' },
      }),
    };

    await expect(authService.login(credentials))
      .rejects.toBeInstanceOf(UnauthorizedError);
  });

  test('error message is deliberately vague — does not reveal email vs password', async () => {
    supabaseAdmin.auth = {
      signInWithPassword: jest.fn().mockResolvedValue({
        data: { session: null }, error: { message: 'Invalid login credentials' },
      }),
    };

    try {
      await authService.login(credentials);
    } catch (err) {
      expect(err.message).not.toMatch(/email/i);
      expect(err.message).not.toMatch(/password/i);
      expect(err.message).toMatch(/invalid email or password/i);
    }
  });

  // ── Tenant guard ───────────────────────────────────────────────

  test('throws UnauthorizedError when user does not belong to the requested academy', async () => {
    supabaseAdmin.auth = {
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
    supabaseAdmin.auth = {
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
    supabaseAdmin.auth = {
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
