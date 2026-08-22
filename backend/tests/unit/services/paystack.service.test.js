// tests/unit/services/paystack.service.test.js
//
// This is the actual cryptographic boundary behind every real payment on
// the platform — fee.service.test.js exercises it only through a mock, so
// it's worth testing the real implementation directly, especially
// verifyWebhookSignature (the check standing between "someone forged a
// webhook" and "a fee gets marked paid").
'use strict';

const crypto = require('crypto');
const paystackService = require('../../../src/services/paystack.service');

describe('paystackService.isConfigured', () => {
  test('false when no key is provided', () => {
    expect(paystackService.isConfigured(null)).toBe(false);
    expect(paystackService.isConfigured(undefined)).toBe(false);
    expect(paystackService.isConfigured('')).toBe(false);
  });

  test('false when the key is too short to be real', () => {
    expect(paystackService.isConfigured('short')).toBe(false);
  });

  test('true for a plausible-length key', () => {
    expect(paystackService.isConfigured('sk_test_abcdefghijklmnopqrstuvwxyz')).toBe(true);
  });
});

describe('paystackService.initializeTransaction', () => {
  const originalFetch = global.fetch;
  afterEach(() => { global.fetch = originalFetch; });

  test('throws without calling the network when no key is configured', async () => {
    global.fetch = jest.fn();

    await expect(paystackService.initializeTransaction({
      secretKey: '', email: 'x@y.com', amountInPesewas: 1000, reference: 'ref1',
    })).rejects.toThrow('No Paystack key configured');

    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('posts the correct payload and returns data on success', async () => {
    let capturedUrl, capturedOptions;
    global.fetch = jest.fn((url, options) => {
      capturedUrl = url; capturedOptions = options;
      return Promise.resolve({
        json: () => Promise.resolve({ status: true, data: { authorization_url: 'https://paystack.com/pay/xyz', access_code: 'abc', reference: 'ref1' } }),
      });
    });

    const result = await paystackService.initializeTransaction({
      secretKey: 'sk_test_valid_key_1234', email: 'kofi@x.com', amountInPesewas: 50000,
      reference: 'ref1', metadata: { fee_id: 'f1' }, callbackUrl: 'https://app.playsams.com/fees/confirm',
    });

    expect(capturedUrl).toBe('https://api.paystack.co/transaction/initialize');
    expect(capturedOptions.headers.Authorization).toBe('Bearer sk_test_valid_key_1234');
    const body = JSON.parse(capturedOptions.body);
    expect(body).toMatchObject({ email: 'kofi@x.com', amount: 50000, currency: 'GHS', reference: 'ref1' });
    expect(result.authorization_url).toBe('https://paystack.com/pay/xyz');
  });

  test('throws when Paystack responds with status: false', async () => {
    global.fetch = jest.fn(() => Promise.resolve({
      json: () => Promise.resolve({ status: false, message: 'Invalid key' }),
    }));

    await expect(paystackService.initializeTransaction({
      secretKey: 'sk_test_valid_key_1234', email: 'kofi@x.com', amountInPesewas: 50000, reference: 'ref1',
    })).rejects.toThrow('Paystack init failed');
  });
});

describe('paystackService.verifyWebhookSignature — the real security boundary', () => {
  const secretKey = 'sk_test_real_academy_secret_key_12345';
  const rawBody = Buffer.from(JSON.stringify({ event: 'charge.success', data: { reference: 'ref1', amount: 5000 } }));

  function computeRealSignature(body, key) {
    return crypto.createHmac('sha512', key).update(body).digest('hex');
  }

  test('returns false when no secret key is configured for the academy', () => {
    const sig = computeRealSignature(rawBody, secretKey);
    expect(paystackService.verifyWebhookSignature(rawBody, sig, null)).toBe(false);
  });

  test('returns false when no signature header is present', () => {
    expect(paystackService.verifyWebhookSignature(rawBody, null, secretKey)).toBe(false);
    expect(paystackService.verifyWebhookSignature(rawBody, '', secretKey)).toBe(false);
  });

  test('returns false for a forged/incorrect signature — this is the actual anti-forgery check', () => {
    const forgedSignature = computeRealSignature(rawBody, 'a-completely-different-key');
    expect(paystackService.verifyWebhookSignature(rawBody, forgedSignature, secretKey)).toBe(false);
  });

  test('returns false when the body has been tampered with after signing (e.g. amount changed)', () => {
    const realSignature = computeRealSignature(rawBody, secretKey);
    const tamperedBody = Buffer.from(JSON.stringify({ event: 'charge.success', data: { reference: 'ref1', amount: 999999999 } }));
    expect(paystackService.verifyWebhookSignature(tamperedBody, realSignature, secretKey)).toBe(false);
  });

  test('returns true only when the signature genuinely matches the body and the academy\'s real key', () => {
    const realSignature = computeRealSignature(rawBody, secretKey);
    expect(paystackService.verifyWebhookSignature(rawBody, realSignature, secretKey)).toBe(true);
  });
});
