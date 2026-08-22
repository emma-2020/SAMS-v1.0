// tests/unit/services/notifications.service.test.js
'use strict';

jest.mock('../../../src/config/supabase');

const { supabaseAdmin } = require('../../../src/config/supabase');
const notificationsService = require('../../../src/services/notifications.service');
const { NotFoundError } = require('../../../src/utils/errors');

function mockChain(returnValue) {
  const terminal = jest.fn().mockResolvedValue(returnValue);
  const handler = {
    select: jest.fn(), insert: jest.fn(), update: jest.fn(), delete: jest.fn(),
    eq: jest.fn(), in: jest.fn(), order: jest.fn(), limit: jest.fn(),
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

describe('notificationsService.create / createForMany', () => {
  test('create swallows a DB error rather than throwing (notification failures must never break the caller)', async () => {
    supabaseAdmin.from = jest.fn().mockReturnValue(mockChain({ data: null, error: { message: 'db down' } }));

    await expect(notificationsService.create({ academyId: 'a1', recipientId: 'u1', type: 'chat', title: 'Hi' }))
      .resolves.toBeUndefined();
  });

  test('createForMany is a no-op with an empty or missing recipient list — never calls the database', async () => {
    supabaseAdmin.from = jest.fn();

    await notificationsService.createForMany({ academyId: 'a1', recipientIds: [], type: 'chat', title: 'Hi' });
    await notificationsService.createForMany({ academyId: 'a1', type: 'chat', title: 'Hi' });

    expect(supabaseAdmin.from).not.toHaveBeenCalled();
  });

  test('createForMany inserts one row per recipient', async () => {
    let insertedRows;
    supabaseAdmin.from = jest.fn().mockImplementation(() => {
      const chain = mockChain({ data: null, error: null });
      chain.insert = jest.fn((rows) => { insertedRows = rows; return chain; });
      return chain;
    });

    await notificationsService.createForMany({ academyId: 'a1', recipientIds: ['u1', 'u2'], type: 'fee', title: 'Fee due' });

    expect(insertedRows).toHaveLength(2);
    expect(insertedRows[0]).toMatchObject({ academy_id: 'a1', recipient_id: 'u1', type: 'fee', title: 'Fee due' });
  });
});

describe('notificationsService.markRead', () => {
  test('throws NotFoundError when the notification does not belong to this user', async () => {
    supabaseAdmin.from = jest.fn().mockReturnValue(mockChain({ data: null, error: null }));

    await expect(notificationsService.markRead('n1', 'someone-elses-id'))
      .rejects.toBeInstanceOf(NotFoundError);
  });

  test('succeeds when the notification belongs to this user', async () => {
    supabaseAdmin.from = jest.fn().mockReturnValue(mockChain({ data: { id: 'n1' }, error: null }));

    await expect(notificationsService.markRead('n1', 'u1')).resolves.toEqual({ id: 'n1' });
  });
});

describe('notificationsService.countUnread / getForUser / markAllRead / remove', () => {
  test('countUnread returns 0, not null/undefined, when the count is missing', async () => {
    supabaseAdmin.from = jest.fn().mockReturnValue(mockChain({ count: null, error: null }));

    await expect(notificationsService.countUnread('u1')).resolves.toBe(0);
  });

  test('getForUser propagates a real DB error instead of swallowing it', async () => {
    supabaseAdmin.from = jest.fn().mockReturnValue(mockChain({ data: null, error: new Error('db down') }));

    await expect(notificationsService.getForUser('u1')).rejects.toThrow('db down');
  });

  test('markAllRead and remove resolve cleanly on success', async () => {
    supabaseAdmin.from = jest.fn().mockReturnValue(mockChain({ data: null, error: null }));

    await expect(notificationsService.markAllRead('u1')).resolves.toBeUndefined();
    await expect(notificationsService.remove('n1', 'u1')).resolves.toBeUndefined();
  });
});

describe('notificationsService.notifyStaff', () => {
  test('only targets Admin and Coach roles', async () => {
    let capturedRoles;
    supabaseAdmin.from = jest.fn().mockImplementation((table) => {
      if (table === 'users') {
        const chain = mockChain({ data: [{ id: 'admin1' }, { id: 'coach1' }], error: null });
        chain.in = jest.fn((col, roles) => { capturedRoles = roles; return chain; });
        return chain;
      }
      return mockChain({ data: null, error: null });
    });

    await notificationsService.notifyStaff({ academyId: 'a1', type: 'report', title: 'New report', body: 'x' });

    expect(capturedRoles).toEqual(['Admin', 'Coach']);
  });

  test('does not throw when the staff lookup itself fails — logs and returns instead', async () => {
    supabaseAdmin.from = jest.fn().mockReturnValue(mockChain({ data: null, error: { message: 'db down' } }));

    await expect(notificationsService.notifyStaff({ academyId: 'a1', type: 'report', title: 'x' }))
      .resolves.toBeUndefined();
  });
});
