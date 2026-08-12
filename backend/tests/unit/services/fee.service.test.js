// tests/unit/services/fee.service.test.js
'use strict';

jest.mock('../../../src/config/supabase');
jest.mock('../../../src/services/email.service');
jest.mock('../../../src/services/paystack.service');

const { supabaseAdmin } = require('../../../src/config/supabase');
const feeService = require('../../../src/services/fee.service');
const emailService = require('../../../src/services/email.service');
const paystackService = require('../../../src/services/paystack.service');
const { NotFoundError, ForbiddenError } = require('../../../src/utils/errors');

function mockChain(returnValue) {
  const terminal = jest.fn().mockResolvedValue(returnValue);
  const handler = {
    select: jest.fn(), insert: jest.fn(), update: jest.fn(), delete: jest.fn(),
    eq: jest.fn(), in: jest.fn(), gte: jest.fn(), lte: jest.fn(), order: jest.fn(),
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
// LIST FEES — role-based scoping (mirrors the RLS fix earlier: Player
// sees only their own rows, Parent only their linked children's, staff
// see the whole academy or one player if filtered).
// ─────────────────────────────────────────────────────────────────

describe('feeService.listFees', () => {
  test('Player sees only their own fee rows', async () => {
    let capturedEq;
    supabaseAdmin.from = jest.fn().mockImplementation(() => {
      const chain = mockChain({ data: [{ id: 'f1' }], error: null });
      chain.eq = jest.fn((col, val) => { if (col === 'player_id') capturedEq = val; return chain; });
      return chain;
    });

    const result = await feeService.listFees({ academyId: 'a1', userId: 'p1', role: 'Player' });

    expect(capturedEq).toBe('p1');
    expect(result).toEqual([{ id: 'f1' }]);
  });

  test('Parent with no linked children gets an empty array without querying fee_ledger for everyone', async () => {
    supabaseAdmin.from = jest.fn().mockImplementation((table) => {
      if (table === 'rosters') return mockChain({ data: [], error: null });
      return mockChain({ data: [{ id: 'should-not-appear' }], error: null });
    });

    const result = await feeService.listFees({ academyId: 'a1', userId: 'parent1', role: 'Parent' });

    expect(result).toEqual([]);
  });

  test('Parent sees fees only for their linked children', async () => {
    let capturedIn;
    supabaseAdmin.from = jest.fn().mockImplementation((table) => {
      if (table === 'rosters') return mockChain({ data: [{ player_id: 'child1' }, { player_id: 'child2' }], error: null });
      const chain = mockChain({ data: [{ id: 'f1' }], error: null });
      chain.in = jest.fn((col, vals) => { capturedIn = vals; return chain; });
      return chain;
    });

    const result = await feeService.listFees({ academyId: 'a1', userId: 'parent1', role: 'Parent' });

    expect(capturedIn).toEqual(['child1', 'child2']);
    expect(result).toEqual([{ id: 'f1' }]);
  });

  test('Admin with no playerId filter sees the whole academy (no player_id scoping applied)', async () => {
    let playerIdEqCalled = false;
    supabaseAdmin.from = jest.fn().mockImplementation(() => {
      const chain = mockChain({ data: [{ id: 'f1' }, { id: 'f2' }], error: null });
      chain.eq = jest.fn((col) => { if (col === 'player_id') playerIdEqCalled = true; return chain; });
      return chain;
    });

    const result = await feeService.listFees({ academyId: 'a1', userId: 'admin1', role: 'Admin' });

    expect(playerIdEqCalled).toBe(false);
    expect(result).toHaveLength(2);
  });
});

// ─────────────────────────────────────────────────────────────────
// CREATE FEE
// ─────────────────────────────────────────────────────────────────

describe('feeService.createFee', () => {
  test('throws NotFoundError when the target user does not exist in this academy', async () => {
    supabaseAdmin.from = jest.fn().mockReturnValue(mockChain({ data: null, error: null }));

    await expect(feeService.createFee({
      academyId: 'a1', adminId: 'admin1', playerId: 'ghost', description: 'Termly fee', amountOwed: 10000,
    })).rejects.toBeInstanceOf(NotFoundError);
  });

  test('throws ForbiddenError when the target user is not a Player', async () => {
    supabaseAdmin.from = jest.fn().mockReturnValue(mockChain({ data: { id: 'c1', role: 'Coach' }, error: null }));

    await expect(feeService.createFee({
      academyId: 'a1', adminId: 'admin1', playerId: 'c1', description: 'Termly fee', amountOwed: 10000,
    })).rejects.toBeInstanceOf(ForbiddenError);
  });

  test('creates the fee record with amount_paid initialized to 0', async () => {
    let insertPayload;
    supabaseAdmin.from = jest.fn().mockImplementation((table) => {
      if (table === 'users') return mockChain({ data: { id: 'p1', role: 'Player', first_name: 'Kofi', email: 'kofi@x.com' }, error: null });
      const chain = mockChain({ data: { id: 'f1', amount_owed: 10000, amount_paid: 0 }, error: null });
      chain.insert = jest.fn((payload) => { insertPayload = payload; return chain; });
      return chain;
    });

    const result = await feeService.createFee({
      academyId: 'a1', adminId: 'admin1', playerId: 'p1', description: '  Termly fee  ', amountOwed: 10000,
    });

    expect(result.amount_paid).toBe(0);
    expect(insertPayload).toMatchObject({ academy_id: 'a1', player_id: 'p1', description: 'Termly fee', amount_owed: 10000, amount_paid: 0, created_by: 'admin1' });
  });
});

// ─────────────────────────────────────────────────────────────────
// UPDATE / DELETE FEE
// ─────────────────────────────────────────────────────────────────

describe('feeService.updateFee', () => {
  test('throws NotFoundError for a wrong-academy or missing fee id', async () => {
    supabaseAdmin.from = jest.fn().mockReturnValue(mockChain({ data: null, error: null }));

    await expect(feeService.updateFee({ academyId: 'a1', feeId: 'ghost', amountOwed: 5000 }))
      .rejects.toBeInstanceOf(NotFoundError);
  });

  test('only includes explicitly-provided fields in the update payload', async () => {
    let updatePayload;
    supabaseAdmin.from = jest.fn().mockImplementation(() => {
      const chain = mockChain({ data: { id: 'f1' }, error: null });
      chain.select = jest.fn().mockReturnValue(chain);
      chain.single = jest.fn().mockImplementation(() => {
        // First .single() call is the existence check; second is the post-update select.
        return Promise.resolve({ data: { id: 'f1', amount_owed: 5000 }, error: null });
      });
      chain.update = jest.fn((payload) => { updatePayload = payload; return chain; });
      return chain;
    });

    await feeService.updateFee({ academyId: 'a1', feeId: 'f1', amountOwed: 5000 });

    expect(updatePayload).toEqual({ amount_owed: 5000 });
  });
});

describe('feeService.deleteFee', () => {
  test('throws NotFoundError when the fee does not belong to this academy', async () => {
    supabaseAdmin.from = jest.fn().mockReturnValue(mockChain({ data: null, error: null }));

    await expect(feeService.deleteFee({ academyId: 'a1', feeId: 'ghost' }))
      .rejects.toBeInstanceOf(NotFoundError);
  });

  test('deletes when the fee exists in this academy', async () => {
    supabaseAdmin.from = jest.fn().mockImplementation(() => {
      const chain = mockChain({ data: { id: 'f1' }, error: null });
      chain.delete = jest.fn().mockReturnValue(mockChain({ data: null, error: null }));
      return chain;
    });

    await expect(feeService.deleteFee({ academyId: 'a1', feeId: 'f1' })).resolves.toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────
// PAYSTACK WEBHOOK — the actual security boundary: an unsigned or
// wrongly-signed payload must never be allowed to mark a fee as paid.
// ─────────────────────────────────────────────────────────────────

describe('feeService.handlePaystackWebhook', () => {
  const chargeSuccessBody = JSON.stringify({
    event: 'charge.success',
    data: { reference: 'ref1', amount: 5000, channel: 'mobile_money', metadata: { fee_id: 'f1' } },
  });

  test('ignores events that are not charge.success, before even checking the signature', async () => {
    const body = JSON.stringify({ event: 'charge.failed', data: {} });

    const result = await feeService.handlePaystackWebhook({ rawBody: Buffer.from(body), signature: 'whatever' });

    expect(result).toEqual({ handled: false });
    expect(paystackService.verifyWebhookSignature).not.toHaveBeenCalled();
  });

  test('throws when the webhook signature is invalid — never applies the payment', async () => {
    supabaseAdmin.from = jest.fn().mockImplementation((table) => {
      if (table === 'fee_ledger') return mockChain({ data: { id: 'f1', academy_id: 'a1' }, error: null });
      if (table === 'academies') return mockChain({ data: { paystack_secret_key: 'sk_test' }, error: null });
      return mockChain({ data: null, error: null });
    });
    paystackService.verifyWebhookSignature.mockReturnValue(false);

    await expect(feeService.handlePaystackWebhook({ rawBody: Buffer.from(chargeSuccessBody), signature: 'bad-sig' }))
      .rejects.toThrow('Invalid Paystack webhook signature.');

    // The update call is further down the function — if we threw before reaching it,
    // no 'fee_ledger'.update should ever have been invoked with a real payload.
    const updateCalls = supabaseAdmin.from.mock.results
      .filter((r) => r.value && typeof r.value.update === 'function')
      .flatMap((r) => r.value.update.mock?.calls ?? []);
    expect(updateCalls.length).toBe(0);
  });

  test('applies the payment and caps amount_paid at amount_owed on a valid signature', async () => {
    let updatePayload;
    supabaseAdmin.from = jest.fn().mockImplementation((table) => {
      if (table === 'fee_ledger') {
        const chain = mockChain({
          id: 'f1', academy_id: 'a1', player_id: 'p1', description: 'Termly fee',
          amount_owed: 6000, amount_paid: 4000,
          player: { first_name: 'Kofi', email: 'kofi@x.com' },
        });
        // Distinguish the lookup selects (thenable, resolves via .single()) from update().
        chain.single = jest.fn().mockResolvedValue({
          data: { id: 'f1', academy_id: 'a1', player_id: 'p1', description: 'Termly fee', amount_owed: 6000, amount_paid: 4000, player: { first_name: 'Kofi', email: 'kofi@x.com' } },
          error: null,
        });
        chain.update = jest.fn((payload) => { updatePayload = payload; return mockChain({ data: null, error: null }); });
        return chain;
      }
      if (table === 'academies') return mockChain({ data: { name: 'Riverside FC', paystack_secret_key: 'sk_test' }, error: null });
      if (table === 'rosters') return mockChain({ data: [], error: null });
      return mockChain({ data: null, error: null });
    });
    paystackService.verifyWebhookSignature.mockReturnValue(true);
    emailService.sendFeeReceiptEmail.mockResolvedValue();

    // amount_owed=6000, amount_paid=4000, charge.amount=5000 -> would be 9000, capped at 6000
    const result = await feeService.handlePaystackWebhook({ rawBody: Buffer.from(chargeSuccessBody), signature: 'good-sig' });
    await new Promise((r) => setImmediate(r));

    expect(result).toEqual({ handled: true });
    expect(updatePayload.amount_paid).toBe(6000);
    expect(updatePayload.payment_method).toBe('MoMo');
  });

  test('returns handled:false when neither fee_id nor reference is present in the payload', async () => {
    const body = JSON.stringify({ event: 'charge.success', data: { amount: 5000, metadata: {} } });

    const result = await feeService.handlePaystackWebhook({ rawBody: Buffer.from(body), signature: 'sig' });

    expect(result).toEqual({ handled: false });
  });
});
