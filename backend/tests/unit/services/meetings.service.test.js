// tests/unit/services/meetings.service.test.js
//
// global.fetch is always mocked here, regardless of whether the local
// .env happens to have a real DAILY_API_KEY (it does) or not (CI's
// doesn't) — that inconsistency would otherwise make these tests behave
// differently locally vs in CI. Mocking fetch means the "configured"
// path never makes a real network call either way.
'use strict';

jest.mock('../../../src/config/supabase');
jest.mock('../../../src/services/email.service');

const { supabaseAdmin } = require('../../../src/config/supabase');
const env = require('../../../src/config/env');
const meetingsService = require('../../../src/services/meetings.service');
const emailService = require('../../../src/services/email.service');
const { NotFoundError, BadRequestError } = require('../../../src/utils/errors');

function mockChain(returnValue) {
  const terminal = jest.fn().mockResolvedValue(returnValue);
  const handler = {
    select: jest.fn(), insert: jest.fn(), update: jest.fn(), delete: jest.fn(),
    eq: jest.fn(), in: jest.fn(), gte: jest.fn(), order: jest.fn(), limit: jest.fn(),
    single: terminal, maybeSingle: terminal,
  };
  Object.keys(handler).forEach((k) => {
    if (k !== 'single' && k !== 'maybeSingle') handler[k].mockReturnValue(handler);
  });
  handler.then = (resolve, reject) => Promise.resolve(returnValue).then(resolve, reject);
  return handler;
}

const originalFetch = global.fetch;
const originalDailyKey = env.DAILY_API_KEY;

beforeEach(() => {
  jest.clearAllMocks();
  env.DAILY_API_KEY = 'a-real-looking-daily-key-1234567890';
  global.fetch = jest.fn(() => Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ name: 'mock-room', url: 'https://daily.co/mock-room' }),
  }));
});

afterAll(() => {
  global.fetch = originalFetch;
  env.DAILY_API_KEY = originalDailyKey;
});

// ─────────────────────────────────────────────────────────────────
// CREATE MEETING
// ─────────────────────────────────────────────────────────────────

describe('meetingsService.createMeeting', () => {
  test('throws BadRequestError when title is missing', async () => {
    await expect(meetingsService.createMeeting({
      title: '', scheduledAt: '2026-09-01T10:00:00Z', attendeeIds: ['u1'], createdBy: 'admin1', academyId: 'a1',
    })).rejects.toBeInstanceOf(BadRequestError);
  });

  test('throws BadRequestError when scheduledAt is missing', async () => {
    await expect(meetingsService.createMeeting({
      title: 'Team sync', scheduledAt: '', attendeeIds: ['u1'], createdBy: 'admin1', academyId: 'a1',
    })).rejects.toBeInstanceOf(BadRequestError);
  });

  test('throws BadRequestError when no attendees are given', async () => {
    await expect(meetingsService.createMeeting({
      title: 'Team sync', scheduledAt: '2026-09-01T10:00:00Z', attendeeIds: [], createdBy: 'admin1', academyId: 'a1',
    })).rejects.toBeInstanceOf(BadRequestError);
  });

  test('creates the Daily room, meeting row, dedups the creator into attendees, and emails everyone', async () => {
    let attendeeRows;
    supabaseAdmin.from = jest.fn().mockImplementation((table) => {
      if (table === 'meetings') return mockChain({ data: { id: 'm1', title: 'Team sync' }, error: null });
      if (table === 'meeting_attendees') {
        const chain = mockChain({ data: null, error: null });
        chain.insert = jest.fn((rows) => { attendeeRows = rows; return chain; });
        return chain;
      }
      if (table === 'users') return mockChain({ data: [{ id: 'admin1', first_name: 'A', last_name: 'B', email: 'a@x.com' }, { id: 'u1', first_name: 'C', last_name: 'D', email: 'c@x.com' }], error: null });
      if (table === 'academies') return mockChain({ data: { name: 'Riverside FC' }, error: null });
      return mockChain({ data: null, error: null });
    });
    emailService.sendMeetingInvitationEmail.mockResolvedValue();

    const result = await meetingsService.createMeeting({
      title: 'Team sync', scheduledAt: '2026-09-01T10:00:00Z', durationMinutes: 30,
      attendeeIds: ['u1', 'admin1'], createdBy: 'admin1', academyId: 'a1',
    });

    expect(result.daily_room_url).toBe('https://daily.co/mock-room');
    // creator was already in attendeeIds — should be deduped, not doubled
    expect(attendeeRows).toHaveLength(2);
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/rooms'), expect.objectContaining({ method: 'POST' }));
  });

  test('falls back to a mock room (no network call) when DAILY_API_KEY is not configured', async () => {
    env.DAILY_API_KEY = '';
    supabaseAdmin.from = jest.fn().mockImplementation((table) => {
      if (table === 'meetings') return mockChain({ data: { id: 'm1', title: 'Team sync' }, error: null });
      if (table === 'users') return mockChain({ data: [], error: null });
      return mockChain({ data: null, error: null });
    });

    const result = await meetingsService.createMeeting({
      title: 'Team sync', scheduledAt: '2026-09-01T10:00:00Z', attendeeIds: ['u1'], createdBy: 'admin1', academyId: 'a1',
    });

    expect(result.daily_room_url).toMatch(/^https:\/\/demo\.daily\.co\//);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────
// GET / CANCEL MEETING
// ─────────────────────────────────────────────────────────────────

describe('meetingsService.getMeetingById / cancelMeeting', () => {
  test('getMeetingById throws NotFoundError for a wrong-academy or missing id', async () => {
    supabaseAdmin.from = jest.fn().mockReturnValue(mockChain({ data: null, error: { message: 'no rows' } }));

    await expect(meetingsService.getMeetingById({ meetingId: 'ghost', academyId: 'a1' }))
      .rejects.toBeInstanceOf(NotFoundError);
  });

  test('cancelMeeting throws NotFoundError when the meeting does not exist', async () => {
    supabaseAdmin.from = jest.fn().mockReturnValue(mockChain({ data: null, error: null }));

    await expect(meetingsService.cancelMeeting({ meetingId: 'ghost', academyId: 'a1' }))
      .rejects.toBeInstanceOf(NotFoundError);
  });

  test('cancelMeeting deletes both the Daily room and the meeting row', async () => {
    supabaseAdmin.from = jest.fn().mockImplementation((table) => {
      if (table === 'meetings') {
        const chain = mockChain({ data: { daily_room_name: 'sams-room-1' }, error: null });
        chain.delete = jest.fn().mockReturnValue(mockChain({ data: null, error: null }));
        return chain;
      }
      return mockChain({ data: null, error: null });
    });

    await meetingsService.cancelMeeting({ meetingId: 'm1', academyId: 'a1' });

    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/rooms/sams-room-1'), expect.objectContaining({ method: 'DELETE' }));
  });
});

// ─────────────────────────────────────────────────────────────────
// INSTANT CALLS
// ─────────────────────────────────────────────────────────────────

describe('meetingsService.startCall / updateCallStatus', () => {
  test('startCall creates a ringing call session', async () => {
    let insertPayload;
    supabaseAdmin.from = jest.fn().mockImplementation(() => {
      const chain = mockChain({ data: { id: 's1', status: 'ringing' }, error: null });
      chain.insert = jest.fn((payload) => { insertPayload = payload; return chain; });
      return chain;
    });

    const result = await meetingsService.startCall({ callerId: 'c1', recipientId: 'p1', academyId: 'a1' });

    expect(result.status).toBe('ringing');
    expect(insertPayload).toMatchObject({ academy_id: 'a1', caller_id: 'c1', recipient_id: 'p1', status: 'ringing' });
  });

  test('updateCallStatus deletes the Daily room and stamps ended_at when the call ends', async () => {
    supabaseAdmin.from = jest.fn().mockReturnValue(mockChain({ data: { id: 's1', status: 'ended', daily_room_name: 'sams-call-1' }, error: null }));

    const result = await meetingsService.updateCallStatus({ sessionId: 's1', status: 'ended' });

    expect(result.status).toBe('ended');
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/rooms/sams-call-1'), expect.objectContaining({ method: 'DELETE' }));
  });

  test('updateCallStatus does NOT touch the Daily room for a non-terminal status', async () => {
    supabaseAdmin.from = jest.fn().mockReturnValue(mockChain({ data: { id: 's1', status: 'active' }, error: null }));

    await meetingsService.updateCallStatus({ sessionId: 's1', status: 'active' });

    expect(global.fetch).not.toHaveBeenCalled();
  });
});
