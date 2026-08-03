// tests/unit/services/schedule.service.test.js
'use strict';

jest.mock('../../../src/config/supabase');
const { supabaseAdmin }   = require('../../../src/config/supabase');
const scheduleService     = require('../../../src/services/schedule.service');
const { ForbiddenError }  = require('../../../src/utils/errors');

// ─── Mock builder ─────────────────────────────────────────────────
function mockFrom(rows, error = null) {
  // Mirrors real supabase-js PostgrestFilterBuilder semantics:
  //   - every filter method (.select/.eq/.in/.gte/.lte/.order) returns the
  //     SAME chainable builder instance, and
  //   - the builder itself is a thenable, so `await query` resolves to
  //     { data, error } even when no terminal method (.single()) was called.
  //   - .single() is the one terminal method that short-circuits to a
  //     resolved { data, error } promise.
  const builder = {};
  ['select', 'eq', 'in', 'gte', 'lte', 'order'].forEach((method) => {
    builder[method] = jest.fn().mockReturnValue(builder);
  });
  builder.single = jest.fn().mockResolvedValue({ data: rows, error });
  builder.then = (resolve, reject) =>
    Promise.resolve({ data: rows, error }).then(resolve, reject);
  return builder;
}

describe('scheduleService.getEvents', () => {

  const BASE = { userId: 'u1', academyId: 'a1', role: 'Admin' };

  test('returns empty array when no teams found for user', async () => {
    supabaseAdmin.from = jest.fn().mockReturnValue(mockFrom([], null));
    const result = await scheduleService.getEvents(BASE);
    expect(result).toEqual([]);
  });

  test('throws ForbiddenError when Coach requests a team they do not own', async () => {
    // resolveAllowedTeamIds returns team T1
    // caller requests team T2
    const allowedTeamsMock = mockFrom([{ id: 'T1' }]);
    const eventsMock       = mockFrom([]);

    let callCount = 0;
    supabaseAdmin.from = jest.fn().mockImplementation(() => {
      callCount++;
      return callCount === 1 ? allowedTeamsMock : eventsMock;
    });

    await expect(
      scheduleService.getEvents({ ...BASE, role: 'Coach', teamId: 'T2' })
    ).rejects.toBeInstanceOf(ForbiddenError);
  });
});

describe('scheduleService.resolveAllowedTeamIds', () => {

  test('Admin returns all academy team IDs', async () => {
    supabaseAdmin.from = jest.fn().mockReturnValue(
      mockFrom([{ id: 'T1' }, { id: 'T2' }, { id: 'T3' }])
    );
    const ids = await scheduleService.resolveAllowedTeamIds({
      userId: 'u1', academyId: 'a1', role: 'Admin',
    });
    expect(ids).toEqual(['T1', 'T2', 'T3']);
  });

  test('Unknown role returns empty array', async () => {
    const ids = await scheduleService.resolveAllowedTeamIds({
      userId: 'u1', academyId: 'a1', role: 'Ghost',
    });
    expect(ids).toEqual([]);
  });
});
