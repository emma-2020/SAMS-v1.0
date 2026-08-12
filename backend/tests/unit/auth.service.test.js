// tests/unit/services/auth.service.test.js
'use strict';

jest.mock('../../src/config/supabase');
// Auto-mocked so registerByInvitation's fire-and-forget notifyStaff() call
// never tries to run real Supabase queries from a unit test.
jest.mock('../../src/services/notifications.service');

const { supabaseAdmin, supabaseAnon } = require('../../src/config/supabase');
const authService        = require('../../src/services/auth.service');
const { ConflictError, UnauthorizedError, NotFoundError, BadRequestError, ForbiddenError } =
  require('../../src/utils/errors');

// ─── Supabase chain mock builder ──────────────────────────────────

function mockChain(returnValue) {
  const terminal = jest.fn().mockResolvedValue(returnValue);
  const handler  = {
    select:      jest.fn(),
    insert:      jest.fn(),
    update:      jest.fn(),
    delete:      jest.fn(),
    eq:          jest.fn(),
    in:          jest.fn(),
    order:       jest.fn(),
    limit:       jest.fn(),
    single:      terminal,
    maybeSingle: terminal,
  };
  // Each builder method returns the same handler (chainable), and the
  // handler itself is awaitable (thenable) so a chain that never calls a
  // terminal method — e.g. .select().eq().order() with no .single() —
  // still resolves to returnValue, matching real supabase-js semantics.
  Object.keys(handler).forEach((k) => {
    if (k !== 'single' && k !== 'maybeSingle') {
      handler[k].mockReturnValue(handler);
    }
  });
  handler.then = (resolve, reject) => Promise.resolve(returnValue).then(resolve, reject);
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

// ─────────────────────────────────────────────────────────────────
// REGISTER BY INVITATION TESTS
// ─────────────────────────────────────────────────────────────────

describe('authService.registerByInvitation', () => {

  const validToken    = 'a'.repeat(64); // verifyInviteToken requires length === 64
  const validPassword = 'StrongPass1!';

  const inviteRow = {
    id:          'invite-1',
    email:       'newplayer@riverside.com',
    role:        'Player',
    first_name:  'Jamie',
    last_name:   'Lee',
    expires_at:  new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1hr from now
    accepted_at: null,
    academies:   { id: 'acad-uuid-001', name: 'Riverside Academy' },
  };

  // Holds the `insert` mock fn captured during the profile-insert call so
  // tests can assert on exactly what was written, not just what's returned.
  let usersInsertMock;

  // Wires supabaseAdmin/supabaseAnon for the full happy-path chain:
  // invitations lookup -> users uniqueness check -> auth createUser ->
  // users insert -> invitations accepted_at update -> sign-in.
  function mockHappyPath() {
    let usersCallCount = 0;
    usersInsertMock = undefined;

    supabaseAdmin.from = jest.fn().mockImplementation((table) => {
      if (table === 'invitations') {
        // Reused for both the verifyInviteToken lookup (.maybeSingle()) and
        // the later accepted_at update (.eq() only, awaited directly).
        return mockChain({ data: inviteRow, error: null });
      }
      if (table === 'users') {
        usersCallCount++;
        if (usersCallCount === 1) {
          // Global email-uniqueness pre-check — no existing user.
          return mockChain({ data: null, error: null });
        }
        // Profile insert.
        const chain = mockChain({
          data: {
            id: 'new-user-id', academy_id: 'acad-uuid-001', email: inviteRow.email,
            role: 'Player', first_name: 'Jamie', last_name: 'Lee',
            avatar_url: null, created_at: '2026-08-01T00:00:00Z',
            date_of_birth: null, terms_accepted_at: '2026-08-01T00:00:00Z',
            terms_version: authService.TERMS_VERSION,
          },
          error: null,
        });
        usersInsertMock = chain.insert;
        return chain;
      }
      return mockChain({ data: null, error: null });
    });

    supabaseAdmin.auth = {
      admin: {
        createUser: jest.fn().mockResolvedValue({
          data:  { user: { id: 'new-user-id' } },
          error: null,
        }),
      },
    };

    supabaseAnon.auth = {
      signInWithPassword: jest.fn().mockResolvedValue({
        data: {
          session: { access_token: 'access.tok', refresh_token: 'refresh.tok', expires_in: 3600 },
        },
        error: null,
      }),
    };
  }

  // ── Required terms consent ─────────────────────────────────────

  test('rejects when terms_accepted is missing', async () => {
    await expect(authService.registerByInvitation({
      token: validToken, password: validPassword,
    })).rejects.toBeInstanceOf(BadRequestError);
  });

  test('rejects when terms_accepted is false', async () => {
    await expect(authService.registerByInvitation({
      token: validToken, password: validPassword, terms_accepted: false,
    })).rejects.toBeInstanceOf(BadRequestError);
  });

  test('rejects a truthy-but-not-boolean-true terms_accepted (e.g. the string "true")', async () => {
    await expect(authService.registerByInvitation({
      token: validToken, password: validPassword, terms_accepted: 'true',
    })).rejects.toBeInstanceOf(BadRequestError);
  });

  test('rejection message names the Terms of Service and Privacy Policy', async () => {
    try {
      await authService.registerByInvitation({
        token: validToken, password: validPassword, terms_accepted: false,
      });
      throw new Error('expected registerByInvitation to reject');
    } catch (err) {
      expect(err.message).toMatch(/Terms of Service and Privacy Policy/);
    }
  });

  // ── Happy paths ───────────────────────────────────────────────

  test('accepts and stores terms_accepted_at + terms_version when terms_accepted is true', async () => {
    mockHappyPath();

    const result = await authService.registerByInvitation({
      token: validToken, password: validPassword, terms_accepted: true,
    });

    expect(result.profile.terms_version).toBe(authService.TERMS_VERSION);
    expect(result.profile.terms_accepted_at).toBeTruthy();

    const insertedRow = usersInsertMock.mock.calls[0][0];
    expect(insertedRow.terms_version).toBe(authService.TERMS_VERSION);
    expect(typeof insertedRow.terms_accepted_at).toBe('string');
    expect(Number.isNaN(Date.parse(insertedRow.terms_accepted_at))).toBe(false);
  });

  test('succeeds with date_of_birth omitted (stored as null)', async () => {
    mockHappyPath();

    const result = await authService.registerByInvitation({
      token: validToken, password: validPassword, terms_accepted: true,
    });

    expect(result.profile).toBeDefined();
    const insertedRow = usersInsertMock.mock.calls[0][0];
    expect(insertedRow.date_of_birth).toBeNull();
  });

  test('accepts and stores a valid date_of_birth', async () => {
    mockHappyPath();

    const result = await authService.registerByInvitation({
      token: validToken, password: validPassword, terms_accepted: true,
      date_of_birth: '2010-05-15',
    });

    expect(result.profile).toBeDefined();
    const insertedRow = usersInsertMock.mock.calls[0][0];
    expect(insertedRow.date_of_birth).toBe('2010-05-15');
  });

  test('rejects a date_of_birth in the future', async () => {
    const futureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      .toISOString().slice(0, 10);

    await expect(authService.registerByInvitation({
      token: validToken, password: validPassword, terms_accepted: true,
      date_of_birth: futureDate,
    })).rejects.toBeInstanceOf(BadRequestError);
  });
});

// ─────────────────────────────────────────────────────────────────
// EXPORT OWN DATA TESTS
// ─────────────────────────────────────────────────────────────────

describe('authService.exportOwnData', () => {

  test('throws NotFoundError when the profile row is missing', async () => {
    supabaseAdmin.from = jest.fn().mockReturnValue(mockChain({ data: null, error: { message: 'no rows' } }));

    await expect(authService.exportOwnData({ userId: 'u1', academyId: 'a1', role: 'Coach' }))
      .rejects.toBeInstanceOf(NotFoundError);
  });

  test('Coach export includes profile and sent messages, but no Player-only sections', async () => {
    supabaseAdmin.from = jest.fn().mockImplementation((table) => {
      if (table === 'users') return mockChain({ data: { id: 'u1', email: 'coach@x.com', role: 'Coach' }, error: null });
      if (table === 'messages') return mockChain({ data: [{ id: 'm1', message_text: 'hi' }], error: null });
      return mockChain({ data: [], error: null });
    });

    const result = await authService.exportOwnData({ userId: 'u1', academyId: 'a1', role: 'Coach' });

    expect(result.profile.id).toBe('u1');
    expect(result.sent_messages).toEqual([{ id: 'm1', message_text: 'hi' }]);
    expect(result.health_logs).toBeUndefined();
    expect(result.registration).toBeUndefined();
  });

  test('Player export includes health logs, attendance, registration, fees, and redacted document metadata', async () => {
    supabaseAdmin.from = jest.fn().mockImplementation((table) => {
      if (table === 'users') return mockChain({ data: { id: 'p1', email: 'player@x.com', role: 'Player' }, error: null });
      if (table === 'health_logs') return mockChain({ data: [{ id: 'h1', fatigue: 3 }], error: null });
      if (table === 'player_registrations') return mockChain({ data: { id: 'r1', medical_conditions: 'none' }, error: null });
      if (table === 'player_documents') return mockChain({ data: [{ id: 'd1', doc_type: 'Birth Certificate', file_name: 'bc.pdf' }], error: null });
      if (table === 'fee_ledger') return mockChain({ data: [{ id: 'f1', amount_owed: 100 }], error: null });
      return mockChain({ data: [], error: null });
    });

    const result = await authService.exportOwnData({ userId: 'p1', academyId: 'a1', role: 'Player' });

    expect(result.health_logs).toEqual([{ id: 'h1', fatigue: 3 }]);
    expect(result.registration).toEqual({ id: 'r1', medical_conditions: 'none' });
    expect(result.fees).toEqual([{ id: 'f1', amount_owed: 100 }]);
    // Document file contents are never included — only metadata plus an explanatory note
    expect(result.documents[0]).toMatchObject({ id: 'd1', doc_type: 'Birth Certificate' });
    expect(result.documents[0].note).toMatch(/not included/i);
    expect(result.documents[0].file_url).toBeUndefined();
  });

  test('Parent export includes linked children by name, not their full records', async () => {
    supabaseAdmin.from = jest.fn().mockImplementation((table) => {
      if (table === 'users') return mockChain({ data: { id: 'par1', email: 'parent@x.com', role: 'Parent' }, error: null });
      if (table === 'rosters') {
        return mockChain({
          data: [{ player_id: 'p1', team_id: 't1', users: { first_name: 'Kofi', last_name: 'Mensah' } }],
          error: null,
        });
      }
      return mockChain({ data: [], error: null });
    });

    const result = await authService.exportOwnData({ userId: 'par1', academyId: 'a1', role: 'Parent' });

    expect(result.linked_children).toEqual([{ player_id: 'p1', team_id: 't1', player_name: 'Kofi Mensah' }]);
    expect(result.health_logs).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────
// DELETE OWN ACCOUNT TESTS
// ─────────────────────────────────────────────────────────────────

describe('authService.deleteOwnAccount', () => {

  test('throws ForbiddenError when caller is the only active Admin in the academy', async () => {
    supabaseAdmin.from = jest.fn().mockReturnValue(mockChain({ count: 1, error: null }));

    await expect(authService.deleteOwnAccount({ userId: 'admin1', academyId: 'a1', role: 'Admin' }))
      .rejects.toBeInstanceOf(ForbiddenError);
  });

  test('Admin can self-delete when another active Admin exists', async () => {
    supabaseAdmin.from = jest.fn().mockImplementation((table) => {
      if (table === 'users') return mockChain({ count: 2, error: null, data: null });
      return mockChain({ data: null, error: null });
    });
    supabaseAdmin.auth = { admin: { deleteUser: jest.fn().mockResolvedValue({ error: null }) } };

    const result = await authService.deleteOwnAccount({ userId: 'admin1', academyId: 'a1', role: 'Admin' });

    expect(result).toEqual({ deleted: true });
    expect(supabaseAdmin.auth.admin.deleteUser).toHaveBeenCalledWith('admin1');
  });

  test('Player/Coach/Parent can self-delete without any admin-count check', async () => {
    supabaseAdmin.from = jest.fn().mockReturnValue(mockChain({ data: null, error: null }));
    supabaseAdmin.auth = { admin: { deleteUser: jest.fn().mockResolvedValue({ error: null }) } };

    const result = await authService.deleteOwnAccount({ userId: 'p1', academyId: 'a1', role: 'Player' });

    expect(result).toEqual({ deleted: true });
  });

  test('throws InternalError when the users row delete fails', async () => {
    supabaseAdmin.from = jest.fn().mockReturnValue(mockChain({ data: null, error: { message: 'db error' } }));

    await expect(authService.deleteOwnAccount({ userId: 'p1', academyId: 'a1', role: 'Player' }))
      .rejects.toThrow('Failed to delete account. Please try again.');
  });
});
