// tests/unit/services/analytics.service.test.js
//
// This file is 947 lines of mostly Admin/Coach-facing dashboard
// aggregation (getFeesAnalytics, getAttendanceAnalytics,
// getWellnessAnalytics, getWorkoutAnalytics, getTeamComparison,
// getPlayerDetail, getAnalyticsSummary) — deliberately NOT covered here.
// Wrong numbers on an academy-wide chart are a real bug but not a
// security/data-isolation one, and the volume of aggregation math would
// consume a large amount of effort for comparatively low risk reduction.
// Focused instead on the three functions with genuine data-isolation
// stakes: a Player's own analytics, and a Parent's analytics — these
// must only ever return the calling user's own (or their own linked
// child's) data, never anyone else's.
'use strict';

jest.mock('../../../src/config/supabase');

const { supabaseAdmin } = require('../../../src/config/supabase');
const analyticsService = require('../../../src/services/analytics.service');

function mockChain(returnValue) {
  const terminal = jest.fn().mockResolvedValue(returnValue);
  const handler = {
    select: jest.fn(), eq: jest.fn(), in: jest.fn(), gte: jest.fn(), lt: jest.fn(), order: jest.fn(), limit: jest.fn(),
    single: terminal, maybeSingle: terminal,
  };
  Object.keys(handler).forEach((k) => {
    if (k !== 'single' && k !== 'maybeSingle') handler[k].mockReturnValue(handler);
  });
  handler.then = (resolve, reject) => Promise.resolve(returnValue).then(resolve, reject);
  return handler;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('analyticsService.getMyWellnessAnalytics', () => {
  test('scopes the health_logs query to the calling user, not just the academy', async () => {
    let capturedPlayerId;
    supabaseAdmin.from = jest.fn().mockImplementation(() => {
      const chain = mockChain({ data: [], error: null });
      chain.eq = jest.fn((col, val) => { if (col === 'player_id') capturedPlayerId = val; return chain; });
      return chain;
    });

    await analyticsService.getMyWellnessAnalytics({ academyId: 'a1', userId: 'p1' });

    expect(capturedPlayerId).toBe('p1');
  });

  test('returns zeroed KPIs rather than crashing when there are no logs yet', async () => {
    supabaseAdmin.from = jest.fn().mockReturnValue(mockChain({ data: [], error: null }));

    const result = await analyticsService.getMyWellnessAnalytics({ academyId: 'a1', userId: 'p1' });

    expect(result.kpis).toMatchObject({ latestScore: 0, avgScore: 0, totalLogs: 0 });
  });
});

describe('analyticsService.getMyAttendanceAnalytics', () => {
  test('scopes the attendance query to the calling user', async () => {
    let capturedPlayerId;
    supabaseAdmin.from = jest.fn().mockImplementation((table) => {
      if (table === 'events') return mockChain({ data: [{ id: 'ev1', start_time: '2026-01-01T00:00:00Z' }], error: null });
      const chain = mockChain({ data: [], error: null });
      chain.eq = jest.fn((col, val) => { if (col === 'player_id') capturedPlayerId = val; return chain; });
      return chain;
    });

    await analyticsService.getMyAttendanceAnalytics({ academyId: 'a1', userId: 'p1' });

    expect(capturedPlayerId).toBe('p1');
  });

  test('returns a clean zero-state (not a crash) when there are no past events at all', async () => {
    supabaseAdmin.from = jest.fn().mockReturnValue(mockChain({ data: [], error: null }));

    const result = await analyticsService.getMyAttendanceAnalytics({ academyId: 'a1', userId: 'p1' });

    expect(result.kpis).toEqual({ rate: 0, present: 0, absent: 0, late: 0, total: 0, gfaEligible: null });
  });

  test('computes the attendance rate counting "late" as half-credit, matching GFA eligibility at 70%', async () => {
    supabaseAdmin.from = jest.fn().mockImplementation((table) => {
      if (table === 'events') return mockChain({
        data: [{ id: 'ev1', start_time: '2026-01-01' }, { id: 'ev2', start_time: '2026-01-02' }],
        error: null,
      });
      return mockChain({ data: [{ event_id: 'ev1', status: 'present' }, { event_id: 'ev2', status: 'late' }], error: null });
    });

    const result = await analyticsService.getMyAttendanceAnalytics({ academyId: 'a1', userId: 'p1' });

    // (1 present + 0.5 * 1 late) / 2 total = 75%
    expect(result.kpis.rate).toBe(75);
    expect(result.kpis.gfaEligible).toBe(true); // (present+late)/total = 2/2 = 100% >= 70%
  });
});

describe('analyticsService.getParentAnalytics', () => {
  test('returns linked:false without crashing when the parent has no roster link at all', async () => {
    supabaseAdmin.from = jest.fn().mockReturnValue(mockChain({ data: null, error: null }));

    const result = await analyticsService.getParentAnalytics({ academyId: 'a1', userId: 'parent1' });

    expect(result).toEqual({ linked: false, child: null, attendance: null, wellness: null, fees: null });
  });

  test('scopes every data source (attendance, health_logs, fee_ledger) to the parent\'s own linked child, not any player', async () => {
    const capturedPlayerIds = {};
    supabaseAdmin.from = jest.fn().mockImplementation((table) => {
      if (table === 'rosters') return mockChain({ data: { player_id: 'my-child-id', player: { first_name: 'Kofi', last_name: 'M' }, team: { name: 'U16' } }, error: null });
      if (table === 'events') return mockChain({ data: [{ id: 'ev1' }], error: null });
      const chain = mockChain({ data: [], error: null });
      chain.eq = jest.fn((col, val) => { if (col === 'player_id') capturedPlayerIds[table] = val; return chain; });
      return chain;
    });

    const result = await analyticsService.getParentAnalytics({ academyId: 'a1', userId: 'parent1' });

    expect(result.linked).toBe(true);
    expect(result.child.id).toBe('my-child-id');
    expect(capturedPlayerIds.attendance).toBe('my-child-id');
    expect(capturedPlayerIds.health_logs).toBe('my-child-id');
    expect(capturedPlayerIds.fee_ledger).toBe('my-child-id');
  });

  test('converts fee amounts from pesewas to cedis correctly and computes the collection rate', async () => {
    supabaseAdmin.from = jest.fn().mockImplementation((table) => {
      if (table === 'rosters') return mockChain({ data: { player_id: 'c1', player: { first_name: 'Kofi', last_name: 'M' }, team: { name: 'U16' } }, error: null });
      if (table === 'events') return mockChain({ data: [], error: null });
      if (table === 'fee_ledger') return mockChain({
        data: [{ amount_owed: 10000, amount_paid: 6000, payment_method: 'MoMo', created_at: '2026-01-01', description: 'Termly fee' }],
        error: null,
      });
      return mockChain({ data: [], error: null });
    });

    const result = await analyticsService.getParentAnalytics({ academyId: 'a1', userId: 'parent1' });

    // 10000 pesewas = GHS 100.00, 6000 pesewas = GHS 60.00
    expect(result.fees.totalOwed).toBe(100);
    expect(result.fees.totalPaid).toBe(60);
    expect(result.fees.outstanding).toBe(40);
    expect(result.fees.collectionRate).toBe(60);
    expect(result.fees.recentPayments[0].status).toBe('partial');
  });
});
