// tests/unit/middleware/extractTenant.test.js
'use strict';

jest.mock('../../src/config/supabase');

const { supabaseAdmin } = require('../../src/config/supabase');
const { extractTenant } = require('../../src/middleware/auth.middleware');

describe('extractTenant middleware', () => {

  test('calls next(UnauthorizedError) when req.user is missing', async () => {
    const req  = {};
    const next = jest.fn();

    await extractTenant(req, {}, next);

    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(401);
    expect(err.message).toMatch(/tenant context missing/i);
  });

  test('calls next(UnauthorizedError) when academy_id is absent on req.user', async () => {
    const req  = { user: { id: 'u1', role: 'Coach' } };  // no academy_id
    const next = jest.fn();

    await extractTenant(req, {}, next);

    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(401);
  });

  // extractTenant deliberately does NOT query the `academies` table (see the
  // in-source comment in auth.middleware.js, and commit 52906f4 "Fix Academy
  // not found error"): doing so via the REST API was causing 406 errors from
  // missing RLS policies on `academies`. req.user.academy_id was already
  // validated against the `users` table FK inside authenticate(), so it is
  // trusted here without a second round-trip. Academy suspended/active
  // gating is explicitly deferred to a V1.1 feature.
  test('does not query the academies table — trusts req.user.academy_id from authenticate()', async () => {
    supabaseAdmin.from = jest.fn();

    const req  = { user: { id: 'u1', academy_id: 'a1', role: 'Player' } };
    const next = jest.fn();

    await extractTenant(req, {}, next);

    expect(supabaseAdmin.from).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith();
    expect(req.academyId).toBe('a1');
  });

  test('attaches req.academyId from req.user.academy_id and leaves req.academyName null (fetched lazily by services)', async () => {
    const req  = { user: { id: 'u1', academy_id: 'a1', role: 'Coach' } };
    const next = jest.fn();

    await extractTenant(req, {}, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.academyId).toBe('a1');
    expect(req.academyName).toBeNull();
  });
});
