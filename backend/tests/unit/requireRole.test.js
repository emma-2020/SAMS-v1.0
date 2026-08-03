// tests/unit/middleware/requireRole.test.js
'use strict';

const { requireRole } = require('../../src/middleware/auth.middleware');

// ─── Helpers ──────────────────────────────────────────────────────

function makeReqWithRole(role) {
  return { user: { id: 'u1', academy_id: 'a1', role } };
}

async function runGuard(guard, req) {
  const next = jest.fn();
  await guard(req, {}, next);
  return next;
}

// ─── Definition-time validation ───────────────────────────────────

describe('requireRole — definition-time validation', () => {

  test('throws a plain Error (not AppError) when an invalid role is passed at definition', () => {
    expect(() => requireRole('SuperUser')).toThrow(
      /invalid role\(s\)/i
    );
  });

  test('throws when any one role in a list is invalid', () => {
    expect(() => requireRole('Admin', 'Wizard')).toThrow(/Wizard/);
  });

  test('does NOT throw when all roles are valid', () => {
    expect(() => requireRole('Admin', 'Coach')).not.toThrow();
    expect(() => requireRole('Player')).not.toThrow();
    expect(() => requireRole('Parent')).not.toThrow();
  });
});

// ─── Runtime behaviour ────────────────────────────────────────────

describe('requireRole — runtime access control', () => {

  // Single-role guards

  test('Admin guard: allows Admin', async () => {
    const guard = requireRole('Admin');
    const next  = await runGuard(guard, makeReqWithRole('Admin'));
    expect(next).toHaveBeenCalledWith();       // no error arg = allowed
  });

  test('Admin guard: blocks Coach with 403', async () => {
    const guard = requireRole('Admin');
    const next  = await runGuard(guard, makeReqWithRole('Coach'));
    const err   = next.mock.calls[0][0];
    expect(err.statusCode).toBe(403);
    expect(err.message).toMatch(/coach/i);
  });

  test('Admin guard: blocks Player with 403', async () => {
    const guard = requireRole('Admin');
    const next  = await runGuard(guard, makeReqWithRole('Player'));
    const err   = next.mock.calls[0][0];
    expect(err.statusCode).toBe(403);
  });

  test('Admin guard: blocks Parent with 403', async () => {
    const guard = requireRole('Admin');
    const next  = await runGuard(guard, makeReqWithRole('Parent'));
    const err   = next.mock.calls[0][0];
    expect(err.statusCode).toBe(403);
  });

  // Multi-role guards

  test('Coach|Admin guard: allows Coach', async () => {
    const guard = requireRole('Admin', 'Coach');
    const next  = await runGuard(guard, makeReqWithRole('Coach'));
    expect(next).toHaveBeenCalledWith();
  });

  test('Coach|Admin guard: allows Admin', async () => {
    const guard = requireRole('Admin', 'Coach');
    const next  = await runGuard(guard, makeReqWithRole('Admin'));
    expect(next).toHaveBeenCalledWith();
  });

  test('Coach|Admin guard: blocks Player with 403', async () => {
    const guard = requireRole('Admin', 'Coach');
    const next  = await runGuard(guard, makeReqWithRole('Player'));
    const err   = next.mock.calls[0][0];
    expect(err.statusCode).toBe(403);
  });

  test('Coach|Admin guard: blocks Parent with 403', async () => {
    const guard = requireRole('Admin', 'Coach');
    const next  = await runGuard(guard, makeReqWithRole('Parent'));
    const err   = next.mock.calls[0][0];
    expect(err.statusCode).toBe(403);
  });

  // Player-specific endpoint
  test('Player-only guard: allows Player, blocks everyone else', async () => {
    const guard = requireRole('Player');

    const playerNext = await runGuard(guard, makeReqWithRole('Player'));
    expect(playerNext).toHaveBeenCalledWith();

    for (const role of ['Admin', 'Coach', 'Parent']) {
      const n = await runGuard(guard, makeReqWithRole(role));
      expect(n.mock.calls[0][0].statusCode).toBe(403);
    }
  });

  // ── Edge cases ─────────────────────────────────────────────────

  test('calls next(UnauthorizedError 401) when req.user is null', async () => {
    const guard = requireRole('Admin');
    const next  = await runGuard(guard, { user: null });
    const err   = next.mock.calls[0][0];
    expect(err.statusCode).toBe(401);
  });

  test('calls next(UnauthorizedError 401) when req.user is undefined', async () => {
    const guard = requireRole('Coach');
    const next  = await runGuard(guard, {});
    const err   = next.mock.calls[0][0];
    expect(err.statusCode).toBe(401);
  });

  test('error message includes the blocked role and allowed roles', async () => {
    const guard = requireRole('Admin', 'Coach');
    const next  = await runGuard(guard, makeReqWithRole('Player'));
    const err   = next.mock.calls[0][0];
    expect(err.message).toMatch(/admin/i);
    expect(err.message).toMatch(/coach/i);
    expect(err.message).toMatch(/player/i);
  });
});

// ─── Specific SAMS business rules ─────────────────────────────────

describe('requireRole — SAMS role boundary scenarios', () => {

  test('Attendance update route: Player cannot mark attendance', async () => {
    const attendanceGuard = requireRole('Admin', 'Coach');
    const next = await runGuard(attendanceGuard, makeReqWithRole('Player'));
    expect(next.mock.calls[0][0].statusCode).toBe(403);
  });

  test('Attendance update route: Parent cannot mark attendance', async () => {
    const attendanceGuard = requireRole('Admin', 'Coach');
    const next = await runGuard(attendanceGuard, makeReqWithRole('Parent'));
    expect(next.mock.calls[0][0].statusCode).toBe(403);
  });

  test('Health log route: Coach cannot submit a player health log', async () => {
    const healthGuard = requireRole('Player');
    const next = await runGuard(healthGuard, makeReqWithRole('Coach'));
    expect(next.mock.calls[0][0].statusCode).toBe(403);
  });

  test('Invite route: Only Admin can send invitations', async () => {
    const inviteGuard = requireRole('Admin');

    const coachNext  = await runGuard(inviteGuard, makeReqWithRole('Coach'));
    const playerNext = await runGuard(inviteGuard, makeReqWithRole('Player'));
    const parentNext = await runGuard(inviteGuard, makeReqWithRole('Parent'));

    expect(coachNext.mock.calls[0][0].statusCode).toBe(403);
    expect(playerNext.mock.calls[0][0].statusCode).toBe(403);
    expect(parentNext.mock.calls[0][0].statusCode).toBe(403);
  });

  test('Event create route: Player and Parent are blocked', async () => {
    const eventGuard = requireRole('Admin', 'Coach');

    for (const role of ['Player', 'Parent']) {
      const next = await runGuard(eventGuard, makeReqWithRole(role));
      expect(next.mock.calls[0][0].statusCode).toBe(403);
    }
  });
});
