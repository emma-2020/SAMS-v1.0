// tests/unit/middleware/extractTenant.test.js
'use strict';

jest.mock('../../../src/config/supabase');

const { supabaseAdmin } = require('../../../src/config/supabase');
const { extractTenant } = require('../../../src/middleware/auth.middleware');

function stubAcademyQuery(academy, error = null) {
  const single = jest.fn().mockResolvedValue({ data: academy, error });
  const eq     = jest.fn().mockReturnValue({ single });
  const select = jest.fn().mockReturnValue({ eq });
  supabaseAdmin.from = jest.fn().mockReturnValue({ select });
}

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

  test('calls next(UnauthorizedError) when academy is not found in DB', async () => {
    stubAcademyQuery(null, { message: 'Not found' });

    const req  = { user: { id: 'u1', academy_id: 'bad-id', role: 'Player' } };
    const next = jest.fn();

    await extractTenant(req, {}, next);

    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(401);
    expect(err.message).toMatch(/academy not found/i);
  });

  test('calls next(ForbiddenError) when academy is suspended (is_active = false)', async () => {
    stubAcademyQuery({ id: 'a1', name: 'Test FC', is_active: false });

    const req  = { user: { id: 'u1', academy_id: 'a1', role: 'Admin' } };
    const next = jest.fn();

    await extractTenant(req, {}, next);

    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(403);
    expect(err.message).toMatch(/suspended/i);
  });

  test('attaches req.academyId and req.academyName on success', async () => {
    stubAcademyQuery({ id: 'a1', name: 'Riverside FC', is_active: true });

    const req  = { user: { id: 'u1', academy_id: 'a1', role: 'Coach' } };
    const next = jest.fn();

    await extractTenant(req, {}, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.academyId).toBe('a1');
    expect(req.academyName).toBe('Riverside FC');
  });
});
