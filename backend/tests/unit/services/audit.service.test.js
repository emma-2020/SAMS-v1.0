// tests/unit/services/audit.service.test.js
//
// AuditService is a fire-and-forget log writer — its one real invariant is
// that a logging failure (DB error, thrown exception, malformed IP) must
// never propagate to the caller, since audit writes are called inline from
// security-critical paths (login, password change) that must not fail
// because logging failed. Also covers the IPv4-mapped IPv6 stripping and
// malformed-IP rejection in sanitizeIp, since Railway's proxy headers are
// the actual source of odd formats this guards against.
'use strict';

jest.mock('../../../src/config/supabase');

const { supabaseAdmin } = require('../../../src/config/supabase');
const auditService = require('../../../src/services/audit.service');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('auditService.log', () => {
  test('inserts a row with all provided fields, defaulting missing optionals to null/{}', async () => {
    let insertPayload;
    supabaseAdmin.from = jest.fn().mockImplementation(() => ({
      insert: jest.fn((payload) => { insertPayload = payload; return Promise.resolve({ error: null }); }),
    }));

    await auditService.log({ event: 'auth.login', academy_id: 'a1', actor_id: 'u1' });

    expect(supabaseAdmin.from).toHaveBeenCalledWith('audit_logs');
    expect(insertPayload).toMatchObject({
      event: 'auth.login', academy_id: 'a1', actor_id: 'u1',
      actor_email: null, actor_role: null, resource: null, resource_id: null,
      meta: {}, ip_address: null,
    });
  });

  test('never throws when the insert returns a DB error', async () => {
    supabaseAdmin.from = jest.fn().mockReturnValue({
      insert: jest.fn().mockResolvedValue({ error: { message: 'db down' } }),
    });

    await expect(auditService.log({ event: 'auth.login' })).resolves.toBeUndefined();
  });

  test('never throws when the insert call itself rejects', async () => {
    supabaseAdmin.from = jest.fn().mockReturnValue({
      insert: jest.fn().mockRejectedValue(new Error('network down')),
    });

    await expect(auditService.log({ event: 'auth.login' })).resolves.toBeUndefined();
  });

  test('strips the IPv4-mapped IPv6 prefix from ip_address', async () => {
    let insertPayload;
    supabaseAdmin.from = jest.fn().mockReturnValue({
      insert: jest.fn((payload) => { insertPayload = payload; return Promise.resolve({ error: null }); }),
    });

    await auditService.log({ event: 'auth.login', ip_address: '::ffff:203.0.113.5' });

    expect(insertPayload.ip_address).toBe('203.0.113.5');
  });

  test('rejects a malformed IP down to null rather than storing garbage', async () => {
    let insertPayload;
    supabaseAdmin.from = jest.fn().mockReturnValue({
      insert: jest.fn((payload) => { insertPayload = payload; return Promise.resolve({ error: null }); }),
    });

    await auditService.log({ event: 'auth.login', ip_address: 'not-an-ip; DROP TABLE users' });

    expect(insertPayload.ip_address).toBeNull();
  });
});

describe('auditService convenience wrappers', () => {
  function captureInsert() {
    let insertPayload;
    supabaseAdmin.from = jest.fn().mockReturnValue({
      insert: jest.fn((payload) => { insertPayload = payload; return Promise.resolve({ error: null }); }),
    });
    return () => insertPayload;
  }

  test('authLogin logs auth.login scoped to the actor and academy', async () => {
    const getPayload = captureInsert();
    await auditService.authLogin({ academy_id: 'a1', actor_id: 'u1', actor_email: 'u@x.com', actor_role: 'Coach', ip: '1.2.3.4' });

    expect(getPayload()).toMatchObject({
      event: 'auth.login', academy_id: 'a1', actor_id: 'u1', actor_email: 'u@x.com',
      actor_role: 'Coach', resource: 'users', resource_id: 'u1', ip_address: '1.2.3.4',
    });
  });

  test('authLoginFailed logs the attempted email and reason, without an actor_id (no account matched)', async () => {
    const getPayload = captureInsert();
    await auditService.authLoginFailed({ email: 'ghost@x.com', academy_id: 'a1', ip: '1.2.3.4', reason: 'bad_password' });

    expect(getPayload()).toMatchObject({
      event: 'auth.login_failed', actor_email: 'ghost@x.com', meta: { reason: 'bad_password' },
    });
    expect(getPayload().actor_id).toBeNull();
  });

  test('authLogout logs auth.logout scoped to the actor', async () => {
    const getPayload = captureInsert();
    await auditService.authLogout({ academy_id: 'a1', actor_id: 'u1', actor_email: 'u@x.com', ip: '1.2.3.4' });

    expect(getPayload()).toMatchObject({ event: 'auth.logout', actor_id: 'u1', resource: 'users', resource_id: 'u1' });
  });

  test('authPasswordChanged logs auth.password_changed', async () => {
    const getPayload = captureInsert();
    await auditService.authPasswordChanged({ academy_id: 'a1', actor_id: 'u1', actor_email: 'u@x.com', ip: '1.2.3.4' });

    expect(getPayload()).toMatchObject({ event: 'auth.password_changed', actor_id: 'u1' });
  });

  test('adminAction passes the caller-supplied event name and resource/meta through untouched', async () => {
    const getPayload = captureInsert();
    await auditService.adminAction({
      event: 'academy.deleted', academy_id: 'a1', actor_id: 'admin1', actor_email: 'a@x.com',
      actor_role: 'Admin', resource: 'academies', resource_id: 'a1', meta: { name: 'Riverside FC' }, ip: '1.2.3.4',
    });

    expect(getPayload()).toMatchObject({
      event: 'academy.deleted', resource: 'academies', resource_id: 'a1', meta: { name: 'Riverside FC' },
    });
  });
});
