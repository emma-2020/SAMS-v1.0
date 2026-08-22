// tests/unit/services/platform.service.test.js
//
// Focused on the highest-stakes logic: platform admin login (including
// the MFA-required branch never leaking a full access token), MFA
// verification (both the TOTP and recovery-code paths, since a bug here
// is an authentication bypass on the account that controls every
// academy), and the guard conditions on approveRequest/deleteAcademy.
// Does not cover the full multi-step approveRequest happy path or the
// simpler read-only listRequests/listAcademies/getStats — lower risk if
// buggy than an MFA bypass.
'use strict';

jest.mock('../../../src/config/supabase');
jest.mock('../../../src/services/email.service');
jest.mock('bcryptjs');
// Explicit factory, not bare jest.mock('otplib') — automock still loads the
// real module to introspect its shape, and otplib's dependency chain
// includes an ESM-only package Jest's default transform can't parse.
jest.mock('otplib', () => ({
  generateSecret: jest.fn(),
  generateSync:   jest.fn(),
  generateURI:    jest.fn(),
  verifySync:     jest.fn(),
}));
// Explicit factory, not bare jest.mock(path) — automock still loads the
// real module first to introspect its shape, and that module throws at
// import time when PLATFORM_JWT_SECRET isn't set (true in CI, which only
// exports placeholder Supabase vars; local .env happens to set it, which
// is why this passed locally but failed in CI).
jest.mock('../../../src/middleware/platformAuth.middleware', () => ({
  platformAuthenticate: jest.fn(),
  signPlatformToken:    jest.fn(),
  signMfaToken:         jest.fn(),
  verifyMfaToken:       jest.fn(),
}));

const { supabaseAdmin } = require('../../../src/config/supabase');
const bcrypt = require('bcryptjs');
const { verifySync } = require('otplib');
const platformAuth = require('../../../src/middleware/platformAuth.middleware');
const platformService = require('../../../src/services/platform.service');
const {
  UnauthorizedError, NotFoundError, ConflictError, BadRequestError,
} = require('../../../src/utils/errors');

function mockChain(returnValue) {
  const terminal = jest.fn().mockResolvedValue(returnValue);
  const handler = {
    select: jest.fn(), insert: jest.fn(), update: jest.fn(), delete: jest.fn(),
    eq: jest.fn(), in: jest.fn(), order: jest.fn(),
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
// LOGIN
// ─────────────────────────────────────────────────────────────────

describe('platformService.login', () => {
  test('throws BadRequestError when email or password is missing', async () => {
    await expect(platformService.login('', 'pw')).rejects.toBeInstanceOf(BadRequestError);
    await expect(platformService.login('a@x.com', '')).rejects.toBeInstanceOf(BadRequestError);
  });

  test('throws UnauthorizedError when no admin matches the email (does not leak "not found" specifically)', async () => {
    supabaseAdmin.from = jest.fn().mockReturnValue(mockChain({ data: null, error: null }));

    await expect(platformService.login('ghost@x.com', 'pw')).rejects.toBeInstanceOf(UnauthorizedError);
  });

  test('throws UnauthorizedError when the account has been deactivated', async () => {
    supabaseAdmin.from = jest.fn().mockReturnValue(mockChain({
      data: { id: 'admin1', is_active: false, password_hash: 'hash', mfa_enabled: false },
      error: null,
    }));

    await expect(platformService.login('a@x.com', 'pw')).rejects.toBeInstanceOf(UnauthorizedError);
  });

  test('throws UnauthorizedError on a wrong password', async () => {
    supabaseAdmin.from = jest.fn().mockReturnValue(mockChain({
      data: { id: 'admin1', is_active: true, password_hash: 'hash', mfa_enabled: false },
      error: null,
    }));
    bcrypt.compare.mockResolvedValue(false);

    await expect(platformService.login('a@x.com', 'wrong')).rejects.toBeInstanceOf(UnauthorizedError);
  });

  test('when MFA is enabled, returns ONLY an mfa_token — never a full access token', async () => {
    supabaseAdmin.from = jest.fn().mockReturnValue(mockChain({
      data: { id: 'admin1', name: 'A', email: 'a@x.com', is_active: true, password_hash: 'hash', mfa_enabled: true },
      error: null,
    }));
    bcrypt.compare.mockResolvedValue(true);
    platformAuth.signMfaToken.mockReturnValue('mfa-challenge-token');

    const result = await platformService.login('a@x.com', 'correct');

    expect(result).toEqual({ mfa_required: true, mfa_token: 'mfa-challenge-token' });
    expect(platformAuth.signPlatformToken).not.toHaveBeenCalled();
  });

  test('when MFA is not enabled, returns a full access token directly', async () => {
    supabaseAdmin.from = jest.fn().mockReturnValue(mockChain({
      data: { id: 'admin1', name: 'A', email: 'a@x.com', is_active: true, password_hash: 'hash', mfa_enabled: false },
      error: null,
    }));
    bcrypt.compare.mockResolvedValue(true);
    platformAuth.signPlatformToken.mockReturnValue('full-access-token');

    const result = await platformService.login('a@x.com', 'correct');

    expect(result.token).toBe('full-access-token');
    expect(platformAuth.signMfaToken).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────
// MFA VERIFY — the actual authentication boundary after password check
// ─────────────────────────────────────────────────────────────────

describe('platformService.mfaVerify', () => {
  test('throws UnauthorizedError when the MFA challenge token itself is invalid or expired', async () => {
    platformAuth.verifyMfaToken.mockImplementation(() => { throw new Error('expired'); });

    await expect(platformService.mfaVerify('bad-token', '123456')).rejects.toBeInstanceOf(UnauthorizedError);
  });

  test('throws UnauthorizedError when the account has been deactivated since the challenge was issued', async () => {
    platformAuth.verifyMfaToken.mockReturnValue({ sub: 'admin1' });
    supabaseAdmin.from = jest.fn().mockReturnValue(mockChain({
      data: { id: 'admin1', is_active: false, mfa_enabled: true, totp_secret: 'sec' },
      error: null,
    }));

    await expect(platformService.mfaVerify('token', '123456')).rejects.toBeInstanceOf(UnauthorizedError);
  });

  test('throws UnauthorizedError on an incorrect TOTP code', async () => {
    platformAuth.verifyMfaToken.mockReturnValue({ sub: 'admin1' });
    supabaseAdmin.from = jest.fn().mockReturnValue(mockChain({
      data: { id: 'admin1', name: 'A', email: 'a@x.com', is_active: true, mfa_enabled: true, totp_secret: 'sec', recovery_codes: [] },
      error: null,
    }));
    verifySync.mockReturnValue({ valid: false });

    await expect(platformService.mfaVerify('token', '000000')).rejects.toBeInstanceOf(UnauthorizedError);
  });

  test('succeeds and issues a full token on a correct TOTP code', async () => {
    platformAuth.verifyMfaToken.mockReturnValue({ sub: 'admin1' });
    supabaseAdmin.from = jest.fn().mockReturnValue(mockChain({
      data: { id: 'admin1', name: 'A', email: 'a@x.com', is_active: true, mfa_enabled: true, totp_secret: 'sec', recovery_codes: [] },
      error: null,
    }));
    verifySync.mockReturnValue({ valid: true });
    platformAuth.signPlatformToken.mockReturnValue('full-access-token');

    const result = await platformService.mfaVerify('token', '123456');

    expect(result.token).toBe('full-access-token');
  });

  test('throws UnauthorizedError for a recovery code that does not match any stored hash', async () => {
    platformAuth.verifyMfaToken.mockReturnValue({ sub: 'admin1' });
    supabaseAdmin.from = jest.fn().mockReturnValue(mockChain({
      data: { id: 'admin1', is_active: true, mfa_enabled: true, totp_secret: 'sec', recovery_codes: ['hash1', 'hash2'] },
      error: null,
    }));
    bcrypt.compare.mockResolvedValue(false);

    await expect(platformService.mfaVerify('token', null, 'WRONG-CODE')).rejects.toBeInstanceOf(UnauthorizedError);
  });

  test('a correct recovery code succeeds AND removes that code from the stored list (single use)', async () => {
    let updatePayload;
    platformAuth.verifyMfaToken.mockReturnValue({ sub: 'admin1' });
    supabaseAdmin.from = jest.fn().mockImplementation(() => {
      const chain = mockChain({
        data: { id: 'admin1', name: 'A', email: 'a@x.com', is_active: true, mfa_enabled: true, totp_secret: 'sec', recovery_codes: ['hash1', 'hash2'] },
        error: null,
      });
      chain.update = jest.fn((payload) => { updatePayload = payload; return chain; });
      return chain;
    });
    // First stored hash matches, second doesn't — simulates the real code being at index 0
    bcrypt.compare.mockImplementation((input, hash) => Promise.resolve(hash === 'hash1'));
    platformAuth.signPlatformToken.mockReturnValue('full-access-token');

    const result = await platformService.mfaVerify('token', null, 'REAL-CODE');

    expect(result.token).toBe('full-access-token');
    expect(updatePayload.recovery_codes).toEqual(['hash2']); // used code removed, other one remains
  });
});

// ─────────────────────────────────────────────────────────────────
// APPROVE / DELETE ACADEMY — guard conditions
// ─────────────────────────────────────────────────────────────────

describe('platformService.approveRequest guards', () => {
  test('throws ConflictError when the request is not pending', async () => {
    supabaseAdmin.from = jest.fn().mockReturnValue(mockChain({ data: { id: 'r1', status: 'approved' }, error: null }));

    await expect(platformService.approveRequest('r1', 'platformAdmin1')).rejects.toBeInstanceOf(ConflictError);
  });

  test('throws ConflictError when the contact email is already a registered Admin elsewhere', async () => {
    let callCount = 0;
    supabaseAdmin.from = jest.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) return mockChain({ data: { id: 'r1', status: 'pending', contact_email: 'x@y.com' }, error: null });
      return mockChain({ data: { id: 'u1', academies: { name: 'Other FC' } }, error: null }); // existing user found
    });

    await expect(platformService.approveRequest('r1', 'platformAdmin1')).rejects.toBeInstanceOf(ConflictError);
  });
});

describe('platformService.deleteAcademy', () => {
  test('throws NotFoundError when the academy does not exist', async () => {
    supabaseAdmin.from = jest.fn().mockReturnValue(mockChain({ data: null, error: null }));

    await expect(platformService.deleteAcademy('ghost')).rejects.toBeInstanceOf(NotFoundError);
  });

  test('succeeds and returns the deleted academy name when it exists', async () => {
    supabaseAdmin.from = jest.fn().mockImplementation((table) => {
      if (table === 'academies') {
        const chain = mockChain({ data: { id: 'a1', name: 'Riverside FC' }, error: null });
        chain.delete = jest.fn().mockReturnValue(mockChain({ data: null, error: null }));
        return chain;
      }
      return mockChain({ data: [], error: null }); // users lookup for auth cleanup
    });

    const result = await platformService.deleteAcademy('a1');

    expect(result).toEqual({ deleted: true, academy_name: 'Riverside FC' });
  });
});
