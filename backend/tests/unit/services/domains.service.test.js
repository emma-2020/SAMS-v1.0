// tests/unit/services/attendance.service.test.js
'use strict';

jest.mock('../../../src/config/supabase');
const { supabaseAdmin }      = require('../../../src/config/supabase');
const attendanceService      = require('../../../src/services/attendance.service');
const { NotFoundError, ForbiddenError, BadRequestError } = require('../../../src/utils/errors');

// Chainable mock that resolves with given data
function chainMock(data, error = null) {
  const result = { data, error };
  const m = {
    select:      jest.fn().mockReturnThis(),
    eq:          jest.fn().mockReturnThis(),
    in:          jest.fn().mockReturnThis(),
    upsert:      jest.fn().mockReturnThis(),
    insert:      jest.fn().mockReturnThis(),
    is:          jest.fn().mockReturnThis(),
    gt:          jest.fn().mockReturnThis(),
    gte:         jest.fn().mockReturnThis(),
    lte:         jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue(result),
    single:      jest.fn().mockResolvedValue(result),
  };
  m.select.mockReturnValue(m);
  m.eq.mockReturnValue(m);
  m.in.mockReturnValue(m);
  m.upsert.mockReturnValue(m);
  m.insert.mockReturnValue(m);
  m.is.mockReturnValue(m);
  m.gt.mockReturnValue(m);
  m.gte.mockReturnValue(m);
  m.lte.mockReturnValue(m);
  return m;
}

describe('attendanceService', () => {

  test('getRosterWithAttendance: throws NotFoundError when event not in academy', async () => {
    supabaseAdmin.from = jest.fn().mockReturnValue(
      chainMock(null, { message: 'Not found' })
    );

    await expect(attendanceService.getRosterWithAttendance({
      eventId: 'bad-id', academyId: 'a1', userId: 'u1', role: 'Coach',
    })).rejects.toBeInstanceOf(NotFoundError);
  });

  test('logAttendance: throws BadRequestError when player not on event team', async () => {
    let callCount = 0;
    supabaseAdmin.from = jest.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // Event lookup — found
        return chainMock({ id: 'ev1', team_id: 'T1', title: 'Test', type: 'Practice',
                           start_time: new Date().toISOString(), location: 'Pitch A', academy_id: 'a1' });
      }
      if (callCount === 2) {
        // assertTeamAccess — admin skips this; here role=Coach, coach_id matches
        return chainMock({ id: 'T1', coach_id: 'u1' });
      }
      // Valid roster — does NOT contain the submitted player_id
      return chainMock([{ player_id: 'validPlayer' }]);
    });

    await expect(attendanceService.logAttendance({
      eventId:   'ev1',
      academyId: 'a1',
      loggedBy:  'u1',
      role:      'Coach',
      records:   [{ player_id: 'NOT_ON_TEAM', status: 'Present' }],
    })).rejects.toBeInstanceOf(BadRequestError);
  });

  test('logAttendance: ForbiddenError when Player tries to log attendance', async () => {
    supabaseAdmin.from = jest.fn().mockReturnValue(
      chainMock({ id: 'ev1', team_id: 'T1', title: 'Test',
                  type: 'Practice', start_time: new Date().toISOString(),
                  location: null, academy_id: 'a1' })
    );

    await expect(attendanceService.logAttendance({
      eventId: 'ev1', academyId: 'a1', loggedBy: 'player1', role: 'Player', records: [],
    })).rejects.toBeInstanceOf(ForbiddenError);
  });
});


// ═══════════════════════════════════════════════════════════════════
// HEALTH SERVICE TESTS
// ═══════════════════════════════════════════════════════════════════

jest.mock('../../../src/config/supabase');
const healthService = require('../../../src/services/health.service');
const { ConflictError } = require('../../../src/utils/errors');

describe('healthService.submitHealthLog', () => {

  test('throws ConflictError when player already submitted today', async () => {
    let callCount = 0;
    supabaseAdmin.from = jest.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // assertPlayerRole — returns Player
        const m = chainMock({ role: 'Player' });
        return m;
      }
      // Duplicate check — existing log found today
      const m = chainMock({ id: 'existing-log', logged_at: new Date().toISOString() });
      return m;
    });

    await expect(healthService.submitHealthLog({
      playerId: 'p1', academyId: 'a1',
      fatigue: 3, soreness: 2, sleep_quality: 4,
    })).rejects.toBeInstanceOf(ConflictError);
  });

  test('throws ForbiddenError when a Coach tries to submit a health log', async () => {
    supabaseAdmin.from = jest.fn().mockReturnValue(
      chainMock({ role: 'Coach' })
    );

    await expect(healthService.submitHealthLog({
      playerId: 'c1', academyId: 'a1',
      fatigue: 2, soreness: 2, sleep_quality: 3,
    })).rejects.toBeInstanceOf(ForbiddenError);
  });

  test('getHealthLogs: Player only receives their own logs (playerIds = [userId])', async () => {
    const mockLogs = [
      { id: 'l1', player_id: 'p1', fatigue: 3, soreness: 2, sleep_quality: 5 },
    ];

    // The query should be scoped to player's own ID.
    // Mirrors the real Supabase query builder: every chain method returns
    // the same thenable builder, so `await` resolves correctly regardless
    // of whether `.in()` is chained on afterwards (it is, for role='Player').
    let capturedIn;
    const m = {
      select:  jest.fn().mockReturnThis(),
      eq:      jest.fn().mockReturnThis(),
      gte:     jest.fn().mockReturnThis(),
      order:   jest.fn().mockReturnThis(),
      in:      jest.fn().mockImplementation((col, ids) => { capturedIn = ids; return m; }),
      then:    (resolve) => resolve({ data: mockLogs, error: null }),
    };
    supabaseAdmin.from = jest.fn().mockReturnValue(m);

    await healthService.getHealthLogs({
      userId: 'p1', academyId: 'a1', role: 'Player',
    });

    expect(capturedIn).toEqual(['p1']);
  });
});


// ═══════════════════════════════════════════════════════════════════
// CHAT SERVICE TESTS
// ═══════════════════════════════════════════════════════════════════

const chatService = require('../../../src/services/chat.service');

describe('chatService', () => {

  test('sendMessage: throws ForbiddenError when Player is not on the team', async () => {
    let callCount = 0;
    supabaseAdmin.from = jest.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) return chainMock({ id: 'T1', name: 'U16', academy_id: 'a1' }); // team found
      // assertTeamMembership — no roster row for this player
      return chainMock(null, null);
    });

    await expect(chatService.sendMessage({
      teamId: 'T1', senderId: 'p_not_member', academyId: 'a1',
      role: 'Player', messageText: 'Hello',
    })).rejects.toBeInstanceOf(ForbiddenError);
  });

  test('sendMessage: throws BadRequestError on blank message after trim', async () => {
    // Stub team found + membership valid
    let callCount = 0;
    supabaseAdmin.from = jest.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) return chainMock({ id: 'T1', name: 'U16', academy_id: 'a1' });
      return chainMock({ id: 'roster-row' }); // member found
    });

    await expect(chatService.sendMessage({
      teamId: 'T1', senderId: 'p1', academyId: 'a1',
      role: 'Player', messageText: '   ',   // only whitespace
    })).rejects.toBeInstanceOf(BadRequestError);
  });

  test('getMessages: Admin always passes team membership check', async () => {
    let channelLookupCalled = false;
    supabaseAdmin.from = jest.fn().mockImplementation((table) => {
      if (table === 'chat_channels') {
        // Resolves the legacy teamId -> channel_id lookup, and later the
        // channel-name lookup for the response payload.
        channelLookupCalled = true;
        return chainMock({ id: 'chan1', name: 'U16', team_id: 'T1', academy_id: 'a1' });
      }
      if (table === 'messages') {
        const m = {
          select: jest.fn().mockReturnThis(),
          eq:     jest.fn().mockReturnThis(),
          order:  jest.fn().mockReturnThis(),
          limit:  jest.fn().mockResolvedValue({ data: [], error: null }),
        };
        return m;
      }
      return chainMock([]);
    });

    // Should not throw despite no roster row
    const result = await chatService.getMessages({
      teamId: 'T1', userId: 'admin1', academyId: 'a1', role: 'Admin',
    });

    expect(result).toHaveProperty('messages');
  });

  test('getMessages: resolves attachment_url to a freshly-signed URL, not the stored value', async () => {
    const storedUrl = 'https://ffbzjkvenamompeaxhpe.supabase.co/storage/v1/object/public/chat-attachments/a1/chan1/123_abc_photo.png';
    const signedUrl  = 'https://ffbzjkvenamompeaxhpe.supabase.co/storage/v1/object/sign/chat-attachments/a1/chan1/123_abc_photo.png?token=fresh';
    const createSignedUrl = jest.fn().mockResolvedValue({ data: { signedUrl }, error: null });
    supabaseAdmin.storage = { from: jest.fn().mockReturnValue({ createSignedUrl }) };

    supabaseAdmin.from = jest.fn().mockImplementation((table) => {
      if (table === 'chat_channels') return chainMock({ id: 'chan1', name: 'U16', team_id: 'T1', academy_id: 'a1' });
      if (table === 'messages') {
        const m = {
          select: jest.fn().mockReturnThis(),
          eq:     jest.fn().mockReturnThis(),
          order:  jest.fn().mockReturnThis(),
          limit:  jest.fn().mockResolvedValue({
            data: [{
              id: 'm1', team_id: 'T1', channel_id: 'chan1', sender_id: 'u1',
              message_text: null, attachment_url: storedUrl,
              file_name: 'photo.png', mime_type: 'image/png', file_size: 111,
              created_at: '2026-01-01T00:00:00Z', users: null,
            }],
            error: null,
          }),
        };
        return m;
      }
      return chainMock([]);
    });

    const result = await chatService.getMessages({
      teamId: 'T1', userId: 'admin1', academyId: 'a1', role: 'Admin',
    });

    expect(result.messages[0].attachment_url).toBe(signedUrl);
    // The extracted path (everything after the bucket segment), not the full stored URL, is what gets signed
    expect(createSignedUrl).toHaveBeenCalledWith('a1/chan1/123_abc_photo.png', expect.any(Number));
  });

  test('uploadAttachment: returns a signed URL, not a permanent public one', async () => {
    const signedUrl = 'https://ffbzjkvenamompeaxhpe.supabase.co/storage/v1/object/sign/chat-attachments/a1/chan1/new-file.png?token=fresh';
    const upload         = jest.fn().mockResolvedValue({ error: null });
    const createSignedUrl = jest.fn().mockResolvedValue({ data: { signedUrl }, error: null });
    supabaseAdmin.storage = { from: jest.fn().mockReturnValue({ upload, createSignedUrl }) };
    supabaseAdmin.from = jest.fn().mockImplementation((table) => {
      if (table === 'chat_channels') return chainMock({ id: 'chan1', name: 'U16', team_id: 'T1', academy_id: 'a1' });
      return chainMock({ user_id: 'admin1' }); // channel membership row
    });

    const result = await chatService.uploadAttachment({
      teamId: 'T1', userId: 'admin1', academyId: 'a1', role: 'Admin',
      fileBuffer: Buffer.from('x'), mimetype: 'image/png',
      originalname: 'new-file.png', fileSize: 1,
    });

    expect(result.url).toBe(signedUrl);
    expect(upload).toHaveBeenCalled();
    expect(createSignedUrl).toHaveBeenCalled();
  });
});


// ═══════════════════════════════════════════════════════════════════
// ADMIN SERVICE TESTS
// ═══════════════════════════════════════════════════════════════════

// Auto-mocked so createInvitation's real send path never fires a live
// Resend API call from a unit test (RESEND_API_KEY is a real key in .env).
jest.mock('../../../src/services/email.service');
const adminService  = require('../../../src/services/admin.service');

describe('adminService.createInvitation', () => {

  const validPayload = {
    adminId:    'admin1',
    academyId:  'a1',
    email:      'newcoach@riverside.com',
    role:       'Coach',
    firstName:  'Alex',
    lastName:   'Turner',
  };

  test('throws ForbiddenError when trying to invite an Admin role', async () => {
    await expect(adminService.createInvitation({ ...validPayload, role: 'Admin' }))
      .rejects.toBeInstanceOf(ForbiddenError);
  });

  test('throws ConflictError when email already registered in academy', async () => {
    let callCount = 0;
    supabaseAdmin.from = jest.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) return chainMock({ id: 'existing-user' });   // user found
      return chainMock(null);
    });

    await expect(adminService.createInvitation(validPayload))
      .rejects.toBeInstanceOf(ConflictError);
  });

  test('throws ConflictError when a pending invite already exists for email', async () => {
    let callCount = 0;
    supabaseAdmin.from = jest.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) return chainMock(null);       // no existing user
      if (callCount === 2) return chainMock({            // existing pending invite
        id: 'inv1', expires_at: new Date(Date.now() + 9999999).toISOString(),
      });
      return chainMock(null);
    });

    await expect(adminService.createInvitation(validPayload))
      .rejects.toBeInstanceOf(ConflictError);
  });

  test('invitation response does NOT contain the token field', async () => {
    let callCount = 0;
    supabaseAdmin.from = jest.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) return chainMock(null);               // no existing user
      if (callCount === 2) return chainMock(null);               // no pending invite
      if (callCount === 3) return chainMock({ id: 'a1', name: 'Riverside FC' }); // academy
      // Insert — returns safe fields only (token excluded in select)
      return chainMock({
        id: 'inv-new', email: 'newcoach@riverside.com',
        role: 'Coach', first_name: 'Alex', last_name: 'Turner',
        expires_at: new Date().toISOString(), created_at: new Date().toISOString(),
      });
    });

    const result = await adminService.createInvitation(validPayload);
    expect(result).not.toHaveProperty('token');
    expect(result.email).toBe('newcoach@riverside.com');
  });
});


// ═══════════════════════════════════════════════════════════════════
// VALIDATE MIDDLEWARE TESTS
// ═══════════════════════════════════════════════════════════════════

const { validateHealthBody, validateAttendanceBody, validateInviteBody } =
  require('../../../src/middleware/validate');

describe('validate middleware', () => {

  function runMiddleware(middleware, body, query = {}) {
    return new Promise((resolve) => {
      const req  = { body, query, params: {} };
      const next = jest.fn((err) => resolve(err));
      middleware(req, {}, next);
    });
  }

  // ── Health ──────────────────────────────────────────────────────

  test('validateHealthBody: passes on valid 1-5 scores', async () => {
    const err = await runMiddleware(validateHealthBody, { fatigue: 3, soreness: 2, sleep_quality: 4 });
    expect(err).toBeUndefined();
  });

  test('validateHealthBody: fails when fatigue is 0', async () => {
    const err = await runMiddleware(validateHealthBody, { fatigue: 0, soreness: 2, sleep_quality: 4 });
    expect(err).toBeDefined();
    expect(err.statusCode).toBe(400);
    expect(err.message).toMatch(/fatigue/i);
  });

  test('validateHealthBody: fails when sleep_quality is 6', async () => {
    const err = await runMiddleware(validateHealthBody, { fatigue: 3, soreness: 3, sleep_quality: 6 });
    expect(err.message).toMatch(/sleep_quality/i);
  });

  test('validateHealthBody: fails when a metric is missing', async () => {
    const err = await runMiddleware(validateHealthBody, { fatigue: 3, soreness: 3 });
    expect(err.message).toMatch(/sleep_quality/i);
  });

  test('validateHealthBody: fails when metric is a non-integer float', async () => {
    const err = await runMiddleware(validateHealthBody, { fatigue: 1.5, soreness: 3, sleep_quality: 4 });
    expect(err.statusCode).toBe(400);
  });

  // ── Attendance ──────────────────────────────────────────────────

  test('validateAttendanceBody: fails with empty records array', async () => {
    const err = await runMiddleware(validateAttendanceBody, { event_id: 'uuid', records: [] });
    expect(err.message).toMatch(/non-empty array/i);
  });

  test('validateAttendanceBody: fails when status is invalid', async () => {
    const err = await runMiddleware(validateAttendanceBody, {
      event_id: 'uuid',
      records:  [{ player_id: 'p1', status: 'Late' }],
    });
    expect(err.message).toMatch(/status/i);
  });

  test('validateAttendanceBody: passes on valid payload', async () => {
    const err = await runMiddleware(validateAttendanceBody, {
      event_id: 'uuid-event',
      records:  [
        { player_id: 'p1', status: 'Present' },
        { player_id: 'p2', status: 'Injured' },
      ],
    });
    expect(err).toBeUndefined();
  });

  // ── Invite ──────────────────────────────────────────────────────

  test('validateInviteBody: fails on invalid email format', async () => {
    const err = await runMiddleware(validateInviteBody, {
      email: 'not-an-email', role: 'Coach', first_name: 'A', last_name: 'B',
    });
    expect(err.message).toMatch(/email/i);
  });

  test('validateInviteBody: fails when role is Admin', async () => {
    const err = await runMiddleware(validateInviteBody, {
      email: 'x@x.com', role: 'Admin', first_name: 'A', last_name: 'B',
    });
    expect(err.message).toMatch(/admin/i);
  });

  test('validateInviteBody: passes on valid Coach invite', async () => {
    const err = await runMiddleware(validateInviteBody, {
      email: 'coach@fc.com', role: 'Coach', first_name: 'Marcus', last_name: 'Reyes',
    });
    expect(err).toBeUndefined();
  });
});
