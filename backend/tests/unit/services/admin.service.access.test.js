// tests/unit/services/admin.service.access.test.js
//
// Covers admin.service.js functions not already exercised by
// domains.service.test.js's adminService.createInvitation block:
// listInvitations, revokeInvitation, setMemberStatus. These are the
// access-control functions — worth their own file given their
// blast radius (deactivating/reactivating any member's account).
'use strict';

jest.mock('../../../src/config/supabase');
jest.mock('../../../src/services/email.service');

const { supabaseAdmin } = require('../../../src/config/supabase');
const adminService = require('../../../src/services/admin.service');
const { NotFoundError, ForbiddenError, InternalError } = require('../../../src/utils/errors');

function mockChain(returnValue) {
  const terminal = jest.fn().mockResolvedValue(returnValue);
  const handler = {
    select: jest.fn(), update: jest.fn(),
    eq: jest.fn(), is: jest.fn(), gt: jest.fn(), lt: jest.fn(), not: jest.fn(), order: jest.fn(),
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

// ─────────────────────────────────────────────────────────────────
// LIST INVITATIONS
// ─────────────────────────────────────────────────────────────────

describe('adminService.listInvitations', () => {
  test('annotates each invitation with a computed status', async () => {
    const future = new Date(Date.now() + 86_400_000).toISOString();
    const past = new Date(Date.now() - 86_400_000).toISOString();
    supabaseAdmin.from = jest.fn().mockReturnValue(mockChain({
      data: [
        { id: 'i1', accepted_at: null, expires_at: future },
        { id: 'i2', accepted_at: '2026-01-01T00:00:00Z', expires_at: future },
        { id: 'i3', accepted_at: null, expires_at: past },
      ],
      error: null,
    }));

    const result = await adminService.listInvitations({ academyId: 'a1' });

    expect(result.find((i) => i.id === 'i1').computed_status).toBe('pending');
    expect(result.find((i) => i.id === 'i2').computed_status).toBe('accepted');
    expect(result.find((i) => i.id === 'i3').computed_status).toBe('expired');
  });

  test('throws InternalError when the query fails', async () => {
    supabaseAdmin.from = jest.fn().mockReturnValue(mockChain({ data: null, error: { message: 'db down' } }));

    await expect(adminService.listInvitations({ academyId: 'a1' })).rejects.toBeInstanceOf(InternalError);
  });
});

// ─────────────────────────────────────────────────────────────────
// REVOKE INVITATION
// ─────────────────────────────────────────────────────────────────

describe('adminService.revokeInvitation', () => {
  test('throws NotFoundError when the invitation is missing, already accepted, or in a different academy', async () => {
    supabaseAdmin.from = jest.fn().mockReturnValue(mockChain({ data: null, error: { message: 'no rows' } }));

    await expect(adminService.revokeInvitation({ invitationId: 'i1', academyId: 'a1' }))
      .rejects.toBeInstanceOf(NotFoundError);
  });

  test('succeeds and returns the revoked invitation when found', async () => {
    supabaseAdmin.from = jest.fn().mockReturnValue(mockChain({ data: { id: 'i1', email: 'x@y.com', expires_at: '2020-01-01T00:00:00Z' }, error: null }));

    const result = await adminService.revokeInvitation({ invitationId: 'i1', academyId: 'a1' });

    expect(result.id).toBe('i1');
  });
});

// ─────────────────────────────────────────────────────────────────
// SET MEMBER STATUS — the exact guard shape deleteOwnAccount later
// reused for self-delete; keep this one directly tested too.
// ─────────────────────────────────────────────────────────────────

describe('adminService.setMemberStatus', () => {
  test('throws ForbiddenError when an Admin tries to change their own status', async () => {
    await expect(adminService.setMemberStatus({
      memberId: 'admin1', academyId: 'a1', requestingAdminId: 'admin1', isActive: false,
    })).rejects.toBeInstanceOf(ForbiddenError);
  });

  test('throws NotFoundError when the member does not exist in this academy', async () => {
    supabaseAdmin.from = jest.fn().mockReturnValue(mockChain({ data: null, error: { message: 'no rows' } }));

    await expect(adminService.setMemberStatus({
      memberId: 'ghost', academyId: 'a1', requestingAdminId: 'admin1', isActive: false,
    })).rejects.toBeInstanceOf(NotFoundError);
  });

  test('throws ForbiddenError when deactivating the only active Admin', async () => {
    supabaseAdmin.from = jest.fn().mockImplementation(() => {
      const chain = mockChain({ data: { id: 'admin2', role: 'Admin', is_active: true }, error: null });
      // The active-admin-count check uses { count: 'exact', head: true } — surface via .then
      chain.then = (resolve) => resolve({ count: 1, error: null });
      chain.single = jest.fn().mockResolvedValue({ data: { id: 'admin2', role: 'Admin', is_active: true }, error: null });
      return chain;
    });

    await expect(adminService.setMemberStatus({
      memberId: 'admin2', academyId: 'a1', requestingAdminId: 'admin1', isActive: false,
    })).rejects.toBeInstanceOf(ForbiddenError);
  });

  test('allows deactivating an Admin when another active Admin exists', async () => {
    let callCount = 0;
    supabaseAdmin.from = jest.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // Member fetch
        return mockChain({ data: { id: 'admin2', role: 'Admin', is_active: true }, error: null });
      }
      if (callCount === 2) {
        // Active-admin count check
        const chain = mockChain({ count: 2, error: null });
        return chain;
      }
      // Final update
      return mockChain({ data: { id: 'admin2', role: 'Admin', is_active: false }, error: null });
    });

    const result = await adminService.setMemberStatus({
      memberId: 'admin2', academyId: 'a1', requestingAdminId: 'admin1', isActive: false,
    });

    expect(result.is_active).toBe(false);
  });

  test('deactivating a non-Admin never triggers the last-active-admin check', async () => {
    let callCount = 0;
    supabaseAdmin.from = jest.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) return mockChain({ data: { id: 'coach1', role: 'Coach', is_active: true }, error: null });
      return mockChain({ data: { id: 'coach1', role: 'Coach', is_active: false }, error: null });
    });

    const result = await adminService.setMemberStatus({
      memberId: 'coach1', academyId: 'a1', requestingAdminId: 'admin1', isActive: false,
    });

    expect(result.is_active).toBe(false);
    expect(callCount).toBe(2); // fetch + update only — no admin-count query
  });
});
