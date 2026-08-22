// tests/unit/services/email.service.test.js
//
// email.service.js is ~1200 lines, but almost all of it is HTML/text
// template builders (sendInvitationEmail, sendFeeReceiptEmail, ...) that
// all funnel through one shared dispatch() function. Testing every
// template's exact markup would be high-maintenance-cost, low-value busy
// work — what's actually worth locking down is dispatch()'s contract,
// since every caller across the codebase (announcements.service,
// registration.service, meetings.service, ...) depends on it:
//   1. isResendConfigured()'s placeholder-key detection (not just falsy)
//   2. the dev-sandbox fallback never calling the real Resend API
//   3. a configured send actually calling Resend with the right envelope
//   4. a Resend API error PROPAGATES (dispatch does not swallow it —
//      callers decide whether to swallow, e.g. announcements.service does)
//
// The Resend client is a module-scoped singleton created once at import
// time (`getResend()` runs at the bottom of email.service.js), so each
// test below resets the module registry and re-requires fresh with its
// own env + resend mock rather than sharing one import across tests.
'use strict';

function loadEmailService(envOverrides = {}) {
  jest.resetModules();
  const sendMock = jest.fn();
  let constructedWithKey = null;
  class MockResend {
    constructor(apiKey) {
      constructedWithKey = apiKey;
      this.emails = { send: sendMock };
    }
  }
  jest.doMock('resend', () => ({ Resend: MockResend }));
  jest.doMock('../../../src/config/env', () => ({
    RESEND_API_KEY: '',
    EMAIL_FROM: 'SAMS Platform <onboarding@resend.dev>',
    ...envOverrides,
  }));
  const emailService = require('../../../src/services/email.service');
  return { emailService, sendMock, wasConstructed: () => constructedWithKey !== null };
}

describe('email dispatch — unconfigured / placeholder key', () => {
  test('falls back to the dev sandbox (no Resend call) when RESEND_API_KEY is unset', async () => {
    const { emailService, sendMock, wasConstructed } = loadEmailService({ RESEND_API_KEY: '' });

    const result = await emailService.sendPasswordResetEmail({
      to: 'p1@x.com', firstName: 'Kofi', resetLink: 'https://app.playsams.com/reset?t=abc',
    });

    expect(result).toEqual({ sent: false, mode: 'sandbox' });
    expect(sendMock).not.toHaveBeenCalled();
    expect(wasConstructed()).toBe(false);
  });

  test('falls back to the dev sandbox for a known placeholder key, not just a falsy one', async () => {
    const { emailService, sendMock } = loadEmailService({ RESEND_API_KEY: 're_placeholder' });

    const result = await emailService.sendPasswordResetEmail({
      to: 'p1@x.com', firstName: 'Kofi', resetLink: 'https://app.playsams.com/reset?t=abc',
    });

    expect(result).toEqual({ sent: false, mode: 'sandbox' });
    expect(sendMock).not.toHaveBeenCalled();
  });

  test('falls back to the dev sandbox for a key that does not start with "re_"', async () => {
    const { emailService, sendMock } = loadEmailService({ RESEND_API_KEY: 'sk_live_not_a_resend_key' });

    const result = await emailService.sendPasswordResetEmail({
      to: 'p1@x.com', firstName: 'Kofi', resetLink: 'https://app.playsams.com/reset?t=abc',
    });

    expect(result).toEqual({ sent: false, mode: 'sandbox' });
    expect(sendMock).not.toHaveBeenCalled();
  });
});

describe('email dispatch — configured', () => {
  test('sends via Resend with the correct envelope and returns the delivered id', async () => {
    const { emailService, sendMock } = loadEmailService({ RESEND_API_KEY: 're_live_abc123xyz' });
    sendMock.mockResolvedValue({ data: { id: 'em_123' }, error: null });

    const result = await emailService.sendPasswordResetEmail({
      to: 'p1@x.com', firstName: 'Kofi', resetLink: 'https://app.playsams.com/reset?t=abc',
    });

    expect(sendMock).toHaveBeenCalledWith(expect.objectContaining({
      from: 'SAMS Platform <onboarding@resend.dev>',
      to: 'p1@x.com',
      subject: 'Reset your SAMS password',
    }));
    expect(result).toEqual({ sent: true, mode: 'resend', id: 'em_123' });
  });

  test('propagates (does not swallow) a Resend delivery error — callers decide whether to catch it', async () => {
    const { emailService, sendMock } = loadEmailService({ RESEND_API_KEY: 're_live_abc123xyz' });
    sendMock.mockResolvedValue({ data: null, error: { message: 'Invalid `to` field' } });

    await expect(emailService.sendPasswordResetEmail({
      to: 'not-an-email', firstName: 'Kofi', resetLink: 'https://app.playsams.com/reset?t=abc',
    })).rejects.toThrow('Resend delivery failed: Invalid `to` field');
  });

  test('sendAcademyCredentialsEmail addresses the caller-supplied login email, not a hardcoded one', async () => {
    const { emailService, sendMock } = loadEmailService({ RESEND_API_KEY: 're_live_abc123xyz' });
    sendMock.mockResolvedValue({ data: { id: 'em_456' }, error: null });

    await emailService.sendAcademyCredentialsEmail({
      to: 'owner@riverside.example', contactName: 'Ama', academyName: 'Riverside FC',
      academyId: 'a1', loginEmail: 'owner@riverside.example', tempPassword: 'Tmp-xyz123',
      loginUrl: 'https://app.playsams.com/login',
    });

    expect(sendMock).toHaveBeenCalledWith(expect.objectContaining({ to: 'owner@riverside.example' }));
  });
});
