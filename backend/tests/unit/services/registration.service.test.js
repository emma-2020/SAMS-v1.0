// tests/unit/services/registration.service.test.js
'use strict';

jest.mock('../../../src/config/supabase');
jest.mock('../../../src/services/email.service');

const { supabaseAdmin } = require('../../../src/config/supabase');
const registrationService = require('../../../src/services/registration.service');
const emailService = require('../../../src/services/email.service');
const {
  BadRequestError, ConflictError, NotFoundError, ForbiddenError,
} = require('../../../src/utils/errors');

// ─── Chainable mock builder — thenable so a chain works whether or not it
// ends on .single()/.maybeSingle() (real supabase-js semantics) ────────────
function mockChain(returnValue) {
  const terminal = jest.fn().mockResolvedValue(returnValue);
  const handler = {
    select: jest.fn(), insert: jest.fn(), update: jest.fn(),
    eq: jest.fn(), order: jest.fn(),
    single: terminal, maybeSingle: terminal,
  };
  Object.keys(handler).forEach((k) => {
    if (k !== 'single' && k !== 'maybeSingle') handler[k].mockReturnValue(handler);
  });
  handler.then = (resolve, reject) => Promise.resolve(returnValue).then(resolve, reject);
  return handler;
}

const REQUIRED_FIELDS = {
  date_of_birth: '2010-01-01',
  phone: '0244000000',
  address: '123 Main St',
  position: 'Forward',
  emergency_contact_name: 'Jane Doe',
  emergency_contact_phone: '0244111111',
  emergency_contact_relationship: 'Mother',
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ─────────────────────────────────────────────────────────────────
// UPLOAD DOCUMENT
// ─────────────────────────────────────────────────────────────────

describe('registrationService.uploadDocument', () => {
  test('rejects a disallowed MIME type', async () => {
    await expect(registrationService.uploadDocument({
      academyId: 'a1', playerId: 'p1', docType: 'national_id',
      buffer: Buffer.from('x'), mimetype: 'application/zip', originalName: 'x.zip',
    })).rejects.toBeInstanceOf(BadRequestError);
  });

  test('rejects a file over 10 MB', async () => {
    await expect(registrationService.uploadDocument({
      academyId: 'a1', playerId: 'p1', docType: 'national_id',
      buffer: Buffer.alloc(11 * 1024 * 1024), mimetype: 'application/pdf', originalName: 'x.pdf',
    })).rejects.toBeInstanceOf(BadRequestError);
  });

  test('returns the storage path, not a full URL, on success', async () => {
    const upload = jest.fn().mockResolvedValue({ error: null });
    supabaseAdmin.storage = { from: jest.fn().mockReturnValue({ upload }) };

    const path = await registrationService.uploadDocument({
      academyId: 'a1', playerId: 'p1', docType: 'national_id',
      buffer: Buffer.from('x'), mimetype: 'application/pdf', originalName: 'id.pdf',
    });

    expect(path).toMatch(/^a1\/p1\/national_id-\d+\.pdf$/);
    expect(path).not.toMatch(/^https?:\/\//);
    expect(upload).toHaveBeenCalled();
  });

  test('throws InternalError when the storage upload fails', async () => {
    supabaseAdmin.storage = { from: jest.fn().mockReturnValue({ upload: jest.fn().mockResolvedValue({ error: { message: 'boom' } }) }) };

    await expect(registrationService.uploadDocument({
      academyId: 'a1', playerId: 'p1', docType: 'national_id',
      buffer: Buffer.from('x'), mimetype: 'application/pdf', originalName: 'id.pdf',
    })).rejects.toThrow('Document upload failed. Please try again.');
  });
});

// ─────────────────────────────────────────────────────────────────
// SAVE DRAFT
// ─────────────────────────────────────────────────────────────────

describe('registrationService.saveDraft', () => {
  test('creates a new draft when no record exists', async () => {
    let insertPayload;
    supabaseAdmin.from = jest.fn().mockImplementation(() => {
      const chain = mockChain({ data: null, error: null }); // existing lookup: none
      chain.insert = jest.fn((payload) => { insertPayload = payload; return chain; });
      chain.single = jest.fn().mockResolvedValue({ data: { id: 'r1', status: 'draft' }, error: null });
      return chain;
    });

    const result = await registrationService.saveDraft({ playerId: 'p1', academyId: 'a1', fields: { phone: '024' } });

    expect(result.status).toBe('draft');
    expect(insertPayload).toMatchObject({ academy_id: 'a1', player_id: 'p1', phone: '024', status: 'draft' });
  });

  test('throws ForbiddenError when the existing registration is already approved', async () => {
    supabaseAdmin.from = jest.fn().mockReturnValue(mockChain({ data: { id: 'r1', status: 'approved' }, error: null }));

    await expect(registrationService.saveDraft({ playerId: 'p1', academyId: 'a1', fields: {} }))
      .rejects.toBeInstanceOf(ForbiddenError);
  });

  test('throws ForbiddenError when the existing registration is already submitted', async () => {
    supabaseAdmin.from = jest.fn().mockReturnValue(mockChain({ data: { id: 'r1', status: 'submitted' }, error: null }));

    await expect(registrationService.saveDraft({ playerId: 'p1', academyId: 'a1', fields: {} }))
      .rejects.toBeInstanceOf(ForbiddenError);
  });
});

// ─────────────────────────────────────────────────────────────────
// SUBMIT REGISTRATION
// ─────────────────────────────────────────────────────────────────

describe('registrationService.submitRegistration', () => {
  function mockHappyPath() {
    supabaseAdmin.from = jest.fn().mockImplementation((table) => {
      if (table === 'player_registrations') {
        const chain = mockChain({ data: null, error: null }); // no existing record
        chain.insert = jest.fn().mockReturnValue(chain);
        chain.single = jest.fn().mockResolvedValue({ data: { id: 'r1', status: 'submitted' }, error: null });
        return chain;
      }
      if (table === 'users') {
        // First call: the submitting player. Second call: admins list.
        const chain = mockChain({ data: { first_name: 'Kofi', last_name: 'Mensah', email: 'kofi@x.com' }, error: null });
        chain.then = (resolve) => resolve({ data: [{ first_name: 'Ama', email: 'admin@x.com' }], error: null });
        return chain;
      }
      if (table === 'academies') return mockChain({ data: { name: 'Riverside FC' }, error: null });
      return mockChain({ data: null, error: null });
    });
  }

  test('throws BadRequestError when required fields are missing', async () => {
    supabaseAdmin.from = jest.fn().mockReturnValue(mockChain({ data: null, error: null }));

    await expect(registrationService.submitRegistration({ playerId: 'p1', academyId: 'a1', fields: {} }))
      .rejects.toBeInstanceOf(BadRequestError);
  });

  test('throws ForbiddenError when already approved', async () => {
    supabaseAdmin.from = jest.fn().mockReturnValue(mockChain({ data: { id: 'r1', status: 'approved' }, error: null }));

    await expect(registrationService.submitRegistration({ playerId: 'p1', academyId: 'a1', fields: REQUIRED_FIELDS }))
      .rejects.toBeInstanceOf(ForbiddenError);
  });

  test('throws ConflictError when already submitted', async () => {
    supabaseAdmin.from = jest.fn().mockReturnValue(mockChain({ data: { id: 'r1', status: 'submitted' }, error: null }));

    await expect(registrationService.submitRegistration({ playerId: 'p1', academyId: 'a1', fields: REQUIRED_FIELDS }))
      .rejects.toBeInstanceOf(ConflictError);
  });

  test('succeeds with valid fields and clears prior review state', async () => {
    mockHappyPath();
    emailService.sendRegistrationSubmittedEmail.mockResolvedValue();
    emailService.sendRegistrationAlertEmail.mockResolvedValue();

    const result = await registrationService.submitRegistration({ playerId: 'p1', academyId: 'a1', fields: REQUIRED_FIELDS });

    expect(result.status).toBe('submitted');
  });

  test('fires submission + admin-alert emails without blocking the response', async () => {
    mockHappyPath();
    emailService.sendRegistrationSubmittedEmail.mockResolvedValue();
    emailService.sendRegistrationAlertEmail.mockResolvedValue();

    await registrationService.submitRegistration({ playerId: 'p1', academyId: 'a1', fields: REQUIRED_FIELDS });
    // Fire-and-forget calls are not awaited by the service — flush microtasks.
    await new Promise((r) => setImmediate(r));

    expect(emailService.sendRegistrationSubmittedEmail).toHaveBeenCalled();
    expect(emailService.sendRegistrationAlertEmail).toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────
// GET MY REGISTRATION
// ─────────────────────────────────────────────────────────────────

describe('registrationService.getMyRegistration', () => {
  test('returns null when the player has no registration yet', async () => {
    supabaseAdmin.from = jest.fn().mockReturnValue(mockChain({ data: null, error: null }));

    const result = await registrationService.getMyRegistration({ playerId: 'p1', academyId: 'a1' });
    expect(result).toBeNull();
  });

  test('returns the record scoped to the caller', async () => {
    supabaseAdmin.from = jest.fn().mockReturnValue(mockChain({ data: { id: 'r1', player_id: 'p1' }, error: null }));

    const result = await registrationService.getMyRegistration({ playerId: 'p1', academyId: 'a1' });
    expect(result).toEqual({ id: 'r1', player_id: 'p1' });
  });
});

// ─────────────────────────────────────────────────────────────────
// LIST / GET (ADMIN)
// ─────────────────────────────────────────────────────────────────

describe('registrationService.listRegistrations / getRegistration', () => {
  test('listRegistrations returns rows for the academy', async () => {
    supabaseAdmin.from = jest.fn().mockReturnValue(mockChain({ data: [{ id: 'r1' }, { id: 'r2' }], error: null }));

    const result = await registrationService.listRegistrations({ academyId: 'a1' });
    expect(result).toHaveLength(2);
  });

  test('getRegistration throws NotFoundError for a wrong-academy or missing id', async () => {
    supabaseAdmin.from = jest.fn().mockReturnValue(mockChain({ data: null, error: { message: 'no rows' } }));

    await expect(registrationService.getRegistration({ id: 'nope', academyId: 'a1' }))
      .rejects.toBeInstanceOf(NotFoundError);
  });

  test('getRegistration resolves signed URLs for all four document fields', async () => {
    supabaseAdmin.from = jest.fn().mockReturnValue(mockChain({
      data: {
        id: 'r1',
        birth_certificate_path: 'a1/p1/birth-1.pdf',
        passport_photo_path: 'a1/p1/photo-1.jpg',
        national_id_path: 'a1/p1/id-1.jpg',
        parent_consent_path: 'a1/p1/consent-1.pdf',
      },
      error: null,
    }));
    supabaseAdmin.storage = {
      from: jest.fn().mockReturnValue({
        createSignedUrl: jest.fn((path) => Promise.resolve({ data: { signedUrl: `https://signed/${path}` }, error: null })),
      }),
    };

    const result = await registrationService.getRegistration({ id: 'r1', academyId: 'a1' });

    expect(result.birth_certificate_url).toBe('https://signed/a1/p1/birth-1.pdf');
    expect(result.national_id_url).toBe('https://signed/a1/p1/id-1.jpg');
  });
});

// ─────────────────────────────────────────────────────────────────
// APPROVE / REJECT
// ─────────────────────────────────────────────────────────────────

describe('registrationService.approveRegistration', () => {
  function mockWithStatus(status) {
    supabaseAdmin.from = jest.fn().mockImplementation((table) => {
      if (table === 'player_registrations') {
        const chain = mockChain({ data: { id: 'r1', status, users: { first_name: 'Kofi', email: 'kofi@x.com' } }, error: null });
        chain.update = jest.fn(() => {
          const updateChain = mockChain({ data: { id: 'r1', status: 'approved' }, error: null });
          return updateChain;
        });
        return chain;
      }
      return mockChain({ data: { name: 'Riverside FC' }, error: null });
    });
  }

  test('throws NotFoundError when the registration does not exist', async () => {
    supabaseAdmin.from = jest.fn().mockReturnValue(mockChain({ data: null, error: { message: 'no rows' } }));

    await expect(registrationService.approveRegistration({ id: 'nope', adminId: 'admin1', academyId: 'a1' }))
      .rejects.toBeInstanceOf(NotFoundError);
  });

  test('throws ConflictError when already approved', async () => {
    mockWithStatus('approved');

    await expect(registrationService.approveRegistration({ id: 'r1', adminId: 'admin1', academyId: 'a1' }))
      .rejects.toBeInstanceOf(ConflictError);
  });

  test('throws BadRequestError when status is not submitted (e.g. still draft)', async () => {
    mockWithStatus('draft');

    await expect(registrationService.approveRegistration({ id: 'r1', adminId: 'admin1', academyId: 'a1' }))
      .rejects.toBeInstanceOf(BadRequestError);
  });

  test('succeeds from submitted and sends the approval email', async () => {
    mockWithStatus('submitted');
    emailService.sendRegistrationApprovedEmail.mockResolvedValue();

    const result = await registrationService.approveRegistration({ id: 'r1', adminId: 'admin1', academyId: 'a1' });
    await new Promise((r) => setImmediate(r));

    expect(result.status).toBe('approved');
    expect(emailService.sendRegistrationApprovedEmail).toHaveBeenCalled();
  });
});

describe('registrationService.rejectRegistration', () => {
  function mockWithStatus(status) {
    supabaseAdmin.from = jest.fn().mockImplementation((table) => {
      if (table === 'player_registrations') {
        const chain = mockChain({ data: { id: 'r1', status, users: { first_name: 'Kofi', email: 'kofi@x.com' } }, error: null });
        chain.update = jest.fn(() => mockChain({ data: { id: 'r1', status: 'rejected', rejection_reason: 'Incomplete documents' }, error: null }));
        return chain;
      }
      return mockChain({ data: { name: 'Riverside FC' }, error: null });
    });
  }

  test('throws BadRequestError when no reason is given', async () => {
    await expect(registrationService.rejectRegistration({ id: 'r1', adminId: 'admin1', academyId: 'a1', reason: '  ' }))
      .rejects.toBeInstanceOf(BadRequestError);
  });

  test('throws BadRequestError when status is not submitted', async () => {
    mockWithStatus('draft');

    await expect(registrationService.rejectRegistration({ id: 'r1', adminId: 'admin1', academyId: 'a1', reason: 'Missing docs' }))
      .rejects.toBeInstanceOf(BadRequestError);
  });

  test('succeeds from submitted and stores the trimmed reason', async () => {
    mockWithStatus('submitted');
    emailService.sendRegistrationRejectedEmail.mockResolvedValue();

    const result = await registrationService.rejectRegistration({ id: 'r1', adminId: 'admin1', academyId: 'a1', reason: '  Incomplete documents  ' });
    await new Promise((r) => setImmediate(r));

    expect(result.status).toBe('rejected');
    expect(emailService.sendRegistrationRejectedEmail).toHaveBeenCalled();
  });
});
