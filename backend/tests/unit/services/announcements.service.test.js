// tests/unit/services/announcements.service.test.js
'use strict';

jest.mock('../../../src/config/supabase');
jest.mock('../../../src/services/notifications.service');
jest.mock('../../../src/services/email.service');

const { supabaseAdmin } = require('../../../src/config/supabase');
const announcementsService = require('../../../src/services/announcements.service');
const notifSvc = require('../../../src/services/notifications.service');
const emailSvc = require('../../../src/services/email.service');
const { NotFoundError } = require('../../../src/utils/errors');

function mockChain(returnValue) {
  const terminal = jest.fn().mockResolvedValue(returnValue);
  const handler = {
    select: jest.fn(), insert: jest.fn(), delete: jest.fn(),
    eq: jest.fn(), in: jest.fn(), gte: jest.fn(), order: jest.fn(), limit: jest.fn(),
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

describe('announcementsService.listAnnouncements', () => {
  test('Admin sees everything — no 24h cutoff, no audience filter applied', async () => {
    let gteCalled = false, inCalled = false;
    supabaseAdmin.from = jest.fn().mockImplementation(() => {
      const chain = mockChain({ data: [{ id: 'ann1' }], error: null });
      chain.gte = jest.fn(() => { gteCalled = true; return chain; });
      chain.in  = jest.fn(() => { inCalled = true; return chain; });
      return chain;
    });

    await announcementsService.listAnnouncements({ academyId: 'a1', userRole: 'Admin' });

    expect(gteCalled).toBe(false);
    expect(inCalled).toBe(false);
  });

  test('Coach is limited to the last 24 hours and to "everyone" + "coaches" audiences', async () => {
    let capturedAudiences;
    supabaseAdmin.from = jest.fn().mockImplementation(() => {
      const chain = mockChain({ data: [], error: null });
      chain.in = jest.fn((col, vals) => { capturedAudiences = vals; return chain; });
      return chain;
    });

    await announcementsService.listAnnouncements({ academyId: 'a1', userRole: 'Coach' });

    expect(capturedAudiences).toEqual(['everyone', 'coaches']);
  });

  test('Player is scoped to "everyone" + "players" audiences', async () => {
    let capturedAudiences;
    supabaseAdmin.from = jest.fn().mockImplementation(() => {
      const chain = mockChain({ data: [], error: null });
      chain.in = jest.fn((col, vals) => { capturedAudiences = vals; return chain; });
      return chain;
    });

    await announcementsService.listAnnouncements({ academyId: 'a1', userRole: 'Player' });

    expect(capturedAudiences).toEqual(['everyone', 'players']);
  });
});

describe('announcementsService.createAnnouncement', () => {
  test('creates the announcement, trimming title and body', async () => {
    let insertPayload;
    supabaseAdmin.from = jest.fn().mockImplementation((table) => {
      if (table === 'announcements') {
        const chain = mockChain({ data: { id: 'ann1', title: 'Trip', audience: 'everyone' }, error: null });
        chain.insert = jest.fn((payload) => { insertPayload = payload; return chain; });
        return chain;
      }
      return mockChain({ data: [], error: null });
    });

    const result = await announcementsService.createAnnouncement({
      academyId: 'a1', adminId: 'admin1', title: '  Trip  ', body: '  Bring boots  ', audience: 'everyone',
    });

    expect(result.id).toBe('ann1');
    expect(insertPayload).toMatchObject({ title: 'Trip', body: 'Bring boots', audience: 'everyone', created_by: 'admin1' });
  });

  test('dispatches in-app notifications only to active users in the target audience role(s)', async () => {
    supabaseAdmin.from = jest.fn().mockImplementation((table) => {
      if (table === 'announcements') return mockChain({ data: { id: 'ann1', title: 'Practice moved', body: 'x', audience: 'players' }, error: null });
      if (table === 'users') return mockChain({ data: [{ id: 'p1', email: 'p1@x.com', first_name: 'Kofi', preferences: {} }], error: null });
      if (table === 'academies') return mockChain({ data: { name: 'Riverside FC' }, error: null });
      return mockChain({ data: null, error: null });
    });
    notifSvc.createForMany.mockResolvedValue();
    emailSvc.sendAnnouncementEmail.mockResolvedValue();

    await announcementsService.createAnnouncement({ academyId: 'a1', adminId: 'admin1', title: 'Practice moved', body: 'x', audience: 'players' });
    await new Promise((r) => setImmediate(r));

    expect(notifSvc.createForMany).toHaveBeenCalledWith(expect.objectContaining({ recipientIds: ['p1'], type: 'announcement' }));
    expect(emailSvc.sendAnnouncementEmail).toHaveBeenCalled();
  });

  test('skips the email (but not the in-app notification) for a user who opted out of team_announcements', async () => {
    supabaseAdmin.from = jest.fn().mockImplementation((table) => {
      if (table === 'announcements') return mockChain({ data: { id: 'ann1', title: 'x', body: 'x', audience: 'everyone' }, error: null });
      if (table === 'users') return mockChain({
        data: [{ id: 'p1', email: 'p1@x.com', first_name: 'Kofi', preferences: { notifications: { team_announcements: false } } }],
        error: null,
      });
      if (table === 'academies') return mockChain({ data: { name: 'Riverside FC' }, error: null });
      return mockChain({ data: null, error: null });
    });
    notifSvc.createForMany.mockResolvedValue();
    emailSvc.sendAnnouncementEmail.mockResolvedValue();

    await announcementsService.createAnnouncement({ academyId: 'a1', adminId: 'admin1', title: 'x', body: 'x' });
    await new Promise((r) => setImmediate(r));

    expect(notifSvc.createForMany).toHaveBeenCalledWith(expect.objectContaining({ recipientIds: ['p1'] }));
    expect(emailSvc.sendAnnouncementEmail).not.toHaveBeenCalled();
  });

  test('createAnnouncement itself does not throw even if the dispatch step fails downstream', async () => {
    supabaseAdmin.from = jest.fn().mockImplementation((table) => {
      if (table === 'announcements') return mockChain({ data: { id: 'ann1', title: 'x', body: 'x', audience: 'everyone' }, error: null });
      if (table === 'users') return mockChain({ data: null, error: { message: 'db down' } });
      return mockChain({ data: null, error: null });
    });

    await expect(announcementsService.createAnnouncement({ academyId: 'a1', adminId: 'admin1', title: 'x', body: 'x' }))
      .resolves.toMatchObject({ id: 'ann1' });
  });
});

describe('announcementsService.deleteAnnouncement', () => {
  test('throws NotFoundError when the announcement does not belong to this academy', async () => {
    supabaseAdmin.from = jest.fn().mockReturnValue(mockChain({ data: null, error: null }));

    await expect(announcementsService.deleteAnnouncement({ academyId: 'a1', announcementId: 'ghost' }))
      .rejects.toBeInstanceOf(NotFoundError);
  });

  test('succeeds when the announcement exists in this academy', async () => {
    supabaseAdmin.from = jest.fn().mockImplementation(() => {
      const chain = mockChain({ data: { id: 'ann1' }, error: null });
      chain.delete = jest.fn().mockReturnValue(mockChain({ data: null, error: null }));
      return chain;
    });

    await expect(announcementsService.deleteAnnouncement({ academyId: 'a1', announcementId: 'ann1' })).resolves.toBeUndefined();
  });
});
