// tests/unit/middleware/authenticate.test.js
'use strict';

/**
 * Tests for the `authenticate` middleware.
 * Supabase is fully mocked — no live network calls.
 */

jest.mock('../../../src/config/supabase');

const { supabaseAdmin }  = require('../../../src/config/supabase');
const { authenticate }   = require('../../../src/middleware/auth.middleware');

// ─── Helpers ──────────────────────────────────────────────────────

/** Builds a mock Express req with an Authorization header */
function makeReq(token) {
  return {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  };
}

/** Captures the next(err) call and returns the error or null */
function makeNext() {
  return jest.fn();
}

/** Stubs supabaseAdmin.auth.getUser to return a user or error */
function stubGetUser(user = null, error = null) {
  supabaseAdmin.auth = {
    getUser: jest.fn().mockResolvedValue({ data: { user }, error }),
  };
}

/** Stubs supabaseAdmin.from().select().eq().single() chain */
function stubProfileQuery(profile = null, error = null) {
  const single = jest.fn().mockResolvedValue({ data: profile, error });
  const eq2    = jest.fn().mockReturnValue({ single });
  const eq1    = jest.fn().mockReturnValue({ eq: eq2 });
  const select = jest.fn().mockReturnValue({ eq: eq1 });
  supabaseAdmin.from = jest.fn().mockReturnValue({ select });
}

// ─── Tests ────────────────────────────────────────────────────────

describe('authenticate middleware', () => {

  // ── Missing / malformed header ───────────────────────────────────

  test('calls next(UnauthorizedError) when Authorization header is absent', async () => {
    const req  = makeReq(null);
    const res  = {};
    const next = makeNext();

    await authenticate(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err).toBeDefined();
    expect(err.statusCode).toBe(401);
    expect(err.message).toMatch(/missing or malformed/i);
  });

  test('calls next(UnauthorizedError) when header does not start with Bearer', async () => {
    const req  = { headers: { authorization: 'Basic abc123' } };
    const next = makeNext();

    await authenticate(req, {}, next);

    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(401);
  });

  test('calls next(UnauthorizedError) when Bearer token is empty string', async () => {
    const req  = { headers: { authorization: 'Bearer ' } };
    const next = makeNext();

    await authenticate(req, {}, next);

    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(401);
    expect(err.message).toMatch(/empty/i);
  });

  // ── Invalid / expired JWT ────────────────────────────────────────

  test('calls next(UnauthorizedError) when Supabase returns an auth error', async () => {
    stubGetUser(null, { message: 'JWT expired' });

    const req  = makeReq('expired.token.here');
    const next = makeNext();

    await authenticate(req, {}, next);

    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(401);
    expect(err.message).toMatch(/invalid or has expired/i);
  });

  test('calls next(UnauthorizedError) when Supabase returns null user', async () => {
    stubGetUser(null, null);   // no error, no user — edge case

    const req  = makeReq('some.valid.token');
    const next = makeNext();

    await authenticate(req, {}, next);

    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(401);
  });

  // ── Profile loading ──────────────────────────────────────────────

  test('calls next(UnauthorizedError) when user profile is not found in DB', async () => {
    stubGetUser({ id: 'auth-user-uuid' }, null);
    stubProfileQuery(null, { message: 'Row not found' });

    const req  = makeReq('valid.token');
    const next = makeNext();

    await authenticate(req, {}, next);

    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(401);
    expect(err.message).toMatch(/profile not found/i);
  });

  test('calls next(UnauthorizedError) when account is deactivated', async () => {
    stubGetUser({ id: 'user-uuid' }, null);
    stubProfileQuery({
      id:         'user-uuid',
      academy_id: 'acad-uuid',
      role:       'Player',
      first_name: 'Jordan',
      last_name:  'Ellis',
      is_active:  false,
    }, null);

    const req  = makeReq('valid.token');
    const next = makeNext();

    await authenticate(req, {}, next);

    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(401);
    expect(err.message).toMatch(/deactivated/i);
  });

  // ── Happy path ───────────────────────────────────────────────────

  test('attaches req.user and calls next() with no error on valid token', async () => {
    const fakeUser = {
      id:         'user-uuid',
      academy_id: 'acad-uuid',
      role:       'Coach',
      first_name: 'Marcus',
      last_name:  'Reyes',
      is_active:  true,
    };

    stubGetUser({ id: fakeUser.id }, null);
    stubProfileQuery(fakeUser, null);

    const req  = makeReq('valid.jwt.token');
    const next = makeNext();

    await authenticate(req, {}, next);

    // next called with no arguments = success
    expect(next).toHaveBeenCalledWith(/* nothing */);
    expect(next.mock.calls[0].length).toBe(0);

    expect(req.user).toEqual({
      id:         'user-uuid',
      academy_id: 'acad-uuid',
      role:       'Coach',
      first_name: 'Marcus',
      last_name:  'Reyes',
    });
    expect(req.accessToken).toBe('valid.jwt.token');
  });

  test('req.user does NOT contain is_active or password fields', async () => {
    const fakeUser = {
      id: 'u1', academy_id: 'a1', role: 'Player',
      first_name: 'Jordan', last_name: 'Ellis', is_active: true,
    };
    stubGetUser({ id: 'u1' }, null);
    stubProfileQuery(fakeUser, null);

    const req  = makeReq('token');
    await authenticate(req, {}, makeNext());

    expect(req.user).not.toHaveProperty('is_active');
    expect(req.user).not.toHaveProperty('password_hash');
  });
});
