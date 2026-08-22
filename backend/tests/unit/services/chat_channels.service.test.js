// tests/unit/services/chat_channels.service.test.js
//
// Focuses on the write/policy-critical functions: group creation
// validation, team/DM channel protection guards, the Coach<->Player DM
// policy gate, blocking, and the moderation (report/review) flow. Skips
// the pure-read/formatting functions (listChannels, getChannelMembers,
// searchUsers, getBlockedUsers, getReports, get/updateAcademySettings)
// as lower risk if buggy — worth a follow-up pass, not covered here.
'use strict';

jest.mock('../../../src/config/supabase');
jest.mock('../../../src/services/notifications.service');
jest.mock('../../../src/services/chat.service', () => ({
  resolveAttachmentUrl: jest.fn(async (url) => url),
}));

const { supabaseAdmin } = require('../../../src/config/supabase');
const chatChannelsService = require('../../../src/services/chat_channels.service');
const { BadRequestError, ForbiddenError, NotFoundError } = require('../../../src/utils/errors');

function mockChain(returnValue) {
  const terminal = jest.fn().mockResolvedValue(returnValue);
  const handler = {
    select: jest.fn(), insert: jest.fn(), update: jest.fn(), delete: jest.fn(), upsert: jest.fn(),
    eq: jest.fn(), neq: jest.fn(), in: jest.fn(), not: jest.fn(), or: jest.fn(), limit: jest.fn(), order: jest.fn(),
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
// CREATE GROUP
// ─────────────────────────────────────────────────────────────────

describe('chatChannelsService.createGroup', () => {
  test('throws BadRequestError when name is blank', async () => {
    await expect(chatChannelsService.createGroup({
      name: '   ', type: 'custom_group', createdBy: 'admin1', academyId: 'a1',
    })).rejects.toBeInstanceOf(BadRequestError);
  });

  test('throws BadRequestError for an invalid type', async () => {
    await expect(chatChannelsService.createGroup({
      name: 'Test', type: 'team', createdBy: 'admin1', academyId: 'a1',
    })).rejects.toBeInstanceOf(BadRequestError);
  });

  test('role_group requires a valid targetRole', async () => {
    await expect(chatChannelsService.createGroup({
      name: 'All Coaches', type: 'role_group', targetRole: 'Admin', createdBy: 'admin1', academyId: 'a1',
    })).rejects.toBeInstanceOf(BadRequestError);
  });

  test('role_group auto-resolves members to every active user with that role', async () => {
    let memberInsertRows;
    supabaseAdmin.from = jest.fn().mockImplementation((table) => {
      if (table === 'users') return mockChain({ data: [{ id: 'c1' }, { id: 'c2' }], error: null });
      if (table === 'chat_channels') return mockChain({ data: { id: 'ch1' }, error: null });
      if (table === 'chat_channel_members') {
        const chain = mockChain({ data: null, error: null });
        chain.insert = jest.fn((rows) => { memberInsertRows = rows; return chain; });
        return chain;
      }
      return mockChain({ data: null, error: null });
    });

    const result = await chatChannelsService.createGroup({
      name: 'All Coaches', type: 'role_group', targetRole: 'Coach', createdBy: 'admin1', academyId: 'a1',
    });

    expect(result.member_count).toBe(3); // 2 coaches + the creator
    const memberIds = memberInsertRows.map((r) => r.user_id);
    expect(memberIds).toEqual(expect.arrayContaining(['c1', 'c2', 'admin1']));
    // Creator is the only admin of the new group
    expect(memberInsertRows.find((r) => r.user_id === 'admin1').is_admin).toBe(true);
    expect(memberInsertRows.find((r) => r.user_id === 'c1').is_admin).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────
// UPDATE / DELETE GROUP — team & direct channel protection
// ─────────────────────────────────────────────────────────────────

describe('chatChannelsService.updateGroup / deleteGroup', () => {
  test('updateGroup throws ForbiddenError on a direct message channel', async () => {
    supabaseAdmin.from = jest.fn().mockReturnValue(mockChain({ data: { id: 'ch1', type: 'direct' }, error: null }));

    await expect(chatChannelsService.updateGroup({ channelId: 'ch1', name: 'New name', academyId: 'a1' }))
      .rejects.toBeInstanceOf(ForbiddenError);
  });

  test('deleteGroup throws ForbiddenError on a team channel', async () => {
    supabaseAdmin.from = jest.fn().mockReturnValue(mockChain({ data: { id: 'ch1', type: 'team' }, error: null }));

    await expect(chatChannelsService.deleteGroup({ channelId: 'ch1', academyId: 'a1' }))
      .rejects.toBeInstanceOf(ForbiddenError);
  });

  test('deleteGroup succeeds on a custom_group channel', async () => {
    let callCount = 0;
    supabaseAdmin.from = jest.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) return mockChain({ data: { id: 'ch1', type: 'custom_group' }, error: null });
      return mockChain({ data: null, error: null });
    });

    await expect(chatChannelsService.deleteGroup({ channelId: 'ch1', academyId: 'a1' }))
      .resolves.toEqual({ deleted: true });
  });

  test('deleteGroup throws NotFoundError for a channel outside this academy', async () => {
    supabaseAdmin.from = jest.fn().mockReturnValue(mockChain({ data: null, error: { message: 'no rows' } }));

    await expect(chatChannelsService.deleteGroup({ channelId: 'ghost', academyId: 'a1' }))
      .rejects.toBeInstanceOf(NotFoundError);
  });
});

// ─────────────────────────────────────────────────────────────────
// ADD / REMOVE MEMBER — direct channel protection
// ─────────────────────────────────────────────────────────────────

describe('chatChannelsService.addMember / removeMember', () => {
  test('addMember throws ForbiddenError on a direct message channel', async () => {
    supabaseAdmin.from = jest.fn().mockReturnValue(mockChain({ data: { id: 'ch1', type: 'direct' }, error: null }));

    await expect(chatChannelsService.addMember({ channelId: 'ch1', userId: 'u1', academyId: 'a1' }))
      .rejects.toBeInstanceOf(ForbiddenError);
  });

  test('addMember throws NotFoundError when the target user is not in this academy', async () => {
    let callCount = 0;
    supabaseAdmin.from = jest.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) return mockChain({ data: { id: 'ch1', type: 'custom_group' }, error: null });
      return mockChain({ data: null, error: null }); // user lookup: not found
    });

    await expect(chatChannelsService.addMember({ channelId: 'ch1', userId: 'ghost', academyId: 'a1' }))
      .rejects.toBeInstanceOf(NotFoundError);
  });

  test('removeMember throws ForbiddenError on a direct message channel', async () => {
    supabaseAdmin.from = jest.fn().mockReturnValue(mockChain({ data: { id: 'ch1', type: 'direct' }, error: null }));

    await expect(chatChannelsService.removeMember({ channelId: 'ch1', userId: 'u1', academyId: 'a1' }))
      .rejects.toBeInstanceOf(ForbiddenError);
  });
});

// ─────────────────────────────────────────────────────────────────
// GET OR CREATE DIRECT — the Coach<->Player DM policy gate + blocking
// ─────────────────────────────────────────────────────────────────

describe('chatChannelsService.getOrCreateDirect', () => {
  test('throws BadRequestError when messaging yourself', async () => {
    await expect(chatChannelsService.getOrCreateDirect({ userId: 'u1', userRole: 'Coach', targetUserId: 'u1', academyId: 'a1' }))
      .rejects.toBeInstanceOf(BadRequestError);
  });

  test('blocks a Coach->Player DM when the academy has NOT enabled that policy', async () => {
    supabaseAdmin.from = jest.fn().mockImplementation((table) => {
      if (table === 'users') return mockChain({ data: { id: 'p1', first_name: 'Kofi', role: 'Player' }, error: null });
      if (table === 'academies') return mockChain({ data: { settings: {} }, error: null }); // policy not enabled
      return mockChain({ data: null, error: null });
    });

    await expect(chatChannelsService.getOrCreateDirect({ userId: 'c1', userRole: 'Coach', targetUserId: 'p1', academyId: 'a1' }))
      .rejects.toBeInstanceOf(ForbiddenError);
  });

  test('allows a Coach->Player DM when the academy HAS enabled that policy', async () => {
    supabaseAdmin.from = jest.fn().mockImplementation((table) => {
      if (table === 'users') return mockChain({ data: { id: 'p1', first_name: 'Kofi', last_name: 'M', role: 'Player' }, error: null });
      if (table === 'academies') return mockChain({ data: { settings: { chat_coach_player_dm: true } }, error: null });
      if (table === 'blocked_users') return mockChain({ data: null, error: null }); // no block
      if (table === 'chat_channel_members') return mockChain({ data: [], error: null }); // no existing memberships
      if (table === 'chat_channels') return mockChain({ data: { id: 'newch1', name: 'Coach & Kofi', type: 'direct' }, error: null });
      return mockChain({ data: null, error: null });
    });

    const result = await chatChannelsService.getOrCreateDirect({ userId: 'c1', userRole: 'Coach', targetUserId: 'p1', academyId: 'a1' });
    expect(result.id).toBe('newch1');
  });

  test('throws ForbiddenError when either user has blocked the other, even for an allowed role pair', async () => {
    supabaseAdmin.from = jest.fn().mockImplementation((table) => {
      if (table === 'users') return mockChain({ data: { id: 'p2', first_name: 'Ama', role: 'Player' }, error: null });
      if (table === 'blocked_users') return mockChain({ data: { blocker_id: 'p2' }, error: null }); // blocked
      return mockChain({ data: null, error: null });
    });

    // Admin<->Player is not policy-gated, so this isolates the block check specifically
    await expect(chatChannelsService.getOrCreateDirect({ userId: 'admin1', userRole: 'Admin', targetUserId: 'p2', academyId: 'a1' }))
      .rejects.toBeInstanceOf(ForbiddenError);
  });

  test('throws NotFoundError when the target user does not exist in this academy', async () => {
    supabaseAdmin.from = jest.fn().mockReturnValue(mockChain({ data: null, error: null }));

    await expect(chatChannelsService.getOrCreateDirect({ userId: 'admin1', userRole: 'Admin', targetUserId: 'ghost', academyId: 'a1' }))
      .rejects.toBeInstanceOf(NotFoundError);
  });
});

// ─────────────────────────────────────────────────────────────────
// LEAVE CHANNEL — team/direct protection + admin-promotion-on-leave
// ─────────────────────────────────────────────────────────────────

describe('chatChannelsService.leaveChannel', () => {
  test('throws ForbiddenError when trying to leave a team channel', async () => {
    supabaseAdmin.from = jest.fn().mockReturnValue(mockChain({ data: { id: 'ch1', type: 'team' }, error: null }));

    await expect(chatChannelsService.leaveChannel({ channelId: 'ch1', userId: 'u1', academyId: 'a1' }))
      .rejects.toBeInstanceOf(ForbiddenError);
  });

  test('throws ForbiddenError when trying to leave a direct message', async () => {
    supabaseAdmin.from = jest.fn().mockReturnValue(mockChain({ data: { id: 'ch1', type: 'direct' }, error: null }));

    await expect(chatChannelsService.leaveChannel({ channelId: 'ch1', userId: 'u1', academyId: 'a1' }))
      .rejects.toBeInstanceOf(ForbiddenError);
  });

  test('promotes the next member to admin when the last admin leaves a group with other members', async () => {
    let promoteCall = null;
    // leaveChannel makes 5 sequential chat_channel_members calls in this order:
    // 1) membership check (.single(), {is_admin:true})  2) otherAdmins query (thenable, [])
    // 3) others query (thenable, [{user_id:'p2'}])       4) promote update        5) delete the leaver
    let membersCallCount = 0;
    supabaseAdmin.from = jest.fn().mockImplementation((table) => {
      if (table === 'chat_channels') return mockChain({ data: { id: 'ch1', type: 'custom_group' }, error: null });
      if (table === 'chat_channel_members') {
        membersCallCount++;
        if (membersCallCount === 1) return mockChain({ data: { is_admin: true }, error: null }); // membership (.single())
        if (membersCallCount === 2) return mockChain({ data: [], error: null }); // otherAdmins (thenable)
        if (membersCallCount === 3) return mockChain({ data: [{ user_id: 'p2' }], error: null }); // others (thenable)
        if (membersCallCount === 4) {
          const chain = mockChain({ data: null, error: null });
          chain.update = jest.fn((payload) => { promoteCall = payload; return chain; });
          return chain;
        }
        return mockChain({ data: null, error: null }); // delete
      }
      return mockChain({ data: null, error: null });
    });

    const result = await chatChannelsService.leaveChannel({ channelId: 'ch1', userId: 'admin1', academyId: 'a1' });

    expect(result).toEqual({ left: true });
    expect(promoteCall).toEqual({ is_admin: true });
  });
});

// ─────────────────────────────────────────────────────────────────
// BLOCK / UNBLOCK USER
// ─────────────────────────────────────────────────────────────────

describe('chatChannelsService.blockUser', () => {
  test('throws BadRequestError when blocking yourself', async () => {
    await expect(chatChannelsService.blockUser({ blockerId: 'u1', blockedId: 'u1', academyId: 'a1' }))
      .rejects.toBeInstanceOf(BadRequestError);
  });

  test('succeeds for a genuine block', async () => {
    supabaseAdmin.from = jest.fn().mockReturnValue(mockChain({ data: null, error: null }));

    await expect(chatChannelsService.blockUser({ blockerId: 'u1', blockedId: 'u2', academyId: 'a1' }))
      .resolves.toEqual({ blocked: true });
  });
});

// ─────────────────────────────────────────────────────────────────
// REPORT MESSAGE / REVIEW REPORT — moderation flow
// ─────────────────────────────────────────────────────────────────

describe('chatChannelsService.reportMessage / reviewReport', () => {
  test('reportMessage throws NotFoundError when the message does not exist in this academy', async () => {
    supabaseAdmin.from = jest.fn().mockReturnValue(mockChain({ data: null, error: null }));

    await expect(chatChannelsService.reportMessage({ messageId: 'ghost', reportedBy: 'u1', reason: 'spam', academyId: 'a1' }))
      .rejects.toBeInstanceOf(NotFoundError);
  });

  test('reportMessage succeeds and notifies staff', async () => {
    const notif = require('../../../src/services/notifications.service');
    notif.notifyStaff.mockResolvedValue();
    supabaseAdmin.from = jest.fn().mockImplementation((table) => {
      if (table === 'messages') return mockChain({ data: { id: 'm1', sender_id: 'p1' }, error: null });
      return mockChain({ data: { id: 'r1', reason: 'spam' }, error: null });
    });

    const result = await chatChannelsService.reportMessage({ messageId: 'm1', reportedBy: 'u1', reason: 'spam', academyId: 'a1' });
    await new Promise((r) => setImmediate(r));

    expect(result.id).toBe('r1');
    expect(notif.notifyStaff).toHaveBeenCalled();
  });

  test('reviewReport rejects an invalid status', async () => {
    await expect(chatChannelsService.reviewReport({ reportId: 'r1', reviewedBy: 'admin1', status: 'deleted', academyId: 'a1' }))
      .rejects.toBeInstanceOf(BadRequestError);
  });

  test('reviewReport throws NotFoundError when the report does not belong to this academy', async () => {
    supabaseAdmin.from = jest.fn().mockReturnValue(mockChain({ data: null, error: null }));

    await expect(chatChannelsService.reviewReport({ reportId: 'ghost', reviewedBy: 'admin1', status: 'dismissed', academyId: 'a1' }))
      .rejects.toBeInstanceOf(NotFoundError);
  });

  test('reviewReport succeeds with a valid status', async () => {
    supabaseAdmin.from = jest.fn().mockReturnValue(mockChain({ data: { id: 'r1', status: 'reviewed' }, error: null }));

    const result = await chatChannelsService.reviewReport({ reportId: 'r1', reviewedBy: 'admin1', status: 'reviewed', academyId: 'a1' });
    expect(result.status).toBe('reviewed');
  });
});
