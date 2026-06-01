// tests/unit/services/schedule.service.test.js
'use strict';

jest.mock('../../../src/config/supabase');
const { supabaseAdmin }   = require('../../../src/config/supabase');
const scheduleService     = require('../../../src/services/schedule.service');
const { ForbiddenError }  = require('../../../src/utils/errors');

// ─── Mock builder ─────────────────────────────────────────────────
function mockFrom(rows, error = null) {
  const terminal = jest.fn().mockResolvedValue({ data: rows, error });
  const builder  = {
    select:  jest.fn().mockReturnThis(),
    eq:      jest.fn().mockReturnThis(),
    in:      jest.fn().mockReturnThis(),
    gte:     jest.fn().mockReturnThis(),
    lte:     jest.fn().mockReturnThis(),
    order:   jest.fn().mockReturnThis(),
    single:  terminal,
    // allow chaining to terminal
  };
  builder.select.mockReturnValue(builder);
  builder.eq.mockReturnValue(builder);
  builder.in.mockReturnValue(builder);
  builder.gte.mockReturnValue(builder);
  builder.lte.mockReturnValue(builder);
  builder.order.mockReturnValue({ ...builder, then: undefined, data: rows, error });
  // Make the query itself await-able (returns { data, error })
  const awaitableBuilder = { ...builder };
  // Override order to return a thenable
  awaitableBuilder.order = jest.fn().mockResolvedValue({ data: rows, error });
  awaitableBuilder.in    = jest.fn().mockReturnValue(awaitableBuilder);
  awaitableBuilder.eq    = jest.fn().mockReturnValue(awaitableBuilder);
  awaitableBuilder.gte   = jest.fn().mockReturnValue(awaitableBuilder);
  awaitableBuilder.lte   = jest.fn().mockReturnValue(awaitableBuilder);
  awaitableBuilder.select = jest.fn().mockReturnValue(awaitableBuilder);
  return awaitableBuilder;
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
