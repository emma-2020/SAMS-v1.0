// tests/unit/services/documents.service.test.js
'use strict';

jest.mock('../../../src/config/supabase');

const { supabaseAdmin } = require('../../../src/config/supabase');
const documentsService = require('../../../src/services/documents.service');
const { NotFoundError, ForbiddenError } = require('../../../src/utils/errors');

function mockChain(returnValue) {
  const terminal = jest.fn().mockResolvedValue(returnValue);
  const handler = {
    select: jest.fn(), insert: jest.fn(), delete: jest.fn(),
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

describe('documentsService.listDocuments', () => {
  test('Player is scoped to only their own documents', async () => {
    let capturedIn;
    supabaseAdmin.from = jest.fn().mockImplementation(() => {
      const chain = mockChain({ data: [{ id: 'd1' }], error: null });
      chain.in = jest.fn((col, ids) => { capturedIn = ids; return chain; });
      return chain;
    });

    await documentsService.listDocuments({ academyId: 'a1', userId: 'p1', role: 'Player' });

    expect(capturedIn).toEqual(['p1']);
  });

  test('Parent with no rostered children gets an empty array', async () => {
    supabaseAdmin.from = jest.fn().mockImplementation((table) => {
      if (table === 'rosters') return mockChain({ data: [], error: null });
      return mockChain({ data: [{ id: 'should-not-appear' }], error: null });
    });

    const result = await documentsService.listDocuments({ academyId: 'a1', userId: 'parent1', role: 'Parent' });

    expect(result).toEqual([]);
  });

  test('Parent is scoped to their linked children only', async () => {
    let capturedIn;
    supabaseAdmin.from = jest.fn().mockImplementation((table) => {
      if (table === 'rosters') return mockChain({ data: [{ player_id: 'c1' }], error: null });
      const chain = mockChain({ data: [{ id: 'd1' }], error: null });
      chain.in = jest.fn((col, ids) => { capturedIn = ids; return chain; });
      return chain;
    });

    await documentsService.listDocuments({ academyId: 'a1', userId: 'parent1', role: 'Parent' });

    expect(capturedIn).toEqual(['c1']);
  });

  test('Admin/Coach with no playerId filter sees the whole academy (no .in() scoping applied)', async () => {
    let inCalled = false;
    supabaseAdmin.from = jest.fn().mockImplementation(() => {
      const chain = mockChain({ data: [{ id: 'd1' }, { id: 'd2' }], error: null });
      chain.in = jest.fn(() => { inCalled = true; return chain; });
      return chain;
    });

    const result = await documentsService.listDocuments({ academyId: 'a1', userId: 'admin1', role: 'Admin' });

    expect(inCalled).toBe(false);
    expect(result).toHaveLength(2);
  });

  test('Admin/Coach with an explicit playerId is scoped to that one player', async () => {
    let capturedIn;
    supabaseAdmin.from = jest.fn().mockImplementation(() => {
      const chain = mockChain({ data: [{ id: 'd1' }], error: null });
      chain.in = jest.fn((col, ids) => { capturedIn = ids; return chain; });
      return chain;
    });

    await documentsService.listDocuments({ academyId: 'a1', userId: 'coach1', role: 'Coach', playerId: 'p9' });

    expect(capturedIn).toEqual(['p9']);
  });
});

describe('documentsService.createDocument', () => {
  test('throws NotFoundError when the target user does not exist in this academy', async () => {
    supabaseAdmin.from = jest.fn().mockReturnValue(mockChain({ data: null, error: null }));

    await expect(documentsService.createDocument({
      academyId: 'a1', uploadedBy: 'coach1', playerId: 'ghost', docType: 'Medical Clearance', fileName: 'x.pdf', fileUrl: 'https://x/x.pdf',
    })).rejects.toBeInstanceOf(NotFoundError);
  });

  test('throws ForbiddenError when attaching a document to a non-Player user', async () => {
    supabaseAdmin.from = jest.fn().mockReturnValue(mockChain({ data: { id: 'c1', role: 'Coach' }, error: null }));

    await expect(documentsService.createDocument({
      academyId: 'a1', uploadedBy: 'coach1', playerId: 'c1', docType: 'Medical Clearance', fileName: 'x.pdf', fileUrl: 'https://x/x.pdf',
    })).rejects.toBeInstanceOf(ForbiddenError);
  });

  test('creates the document record, trimming file name and URL', async () => {
    let insertPayload;
    supabaseAdmin.from = jest.fn().mockImplementation((table) => {
      if (table === 'users') return mockChain({ data: { id: 'p1', role: 'Player' }, error: null });
      const chain = mockChain({ data: { id: 'd1' }, error: null });
      chain.insert = jest.fn((payload) => { insertPayload = payload; return chain; });
      return chain;
    });

    await documentsService.createDocument({
      academyId: 'a1', uploadedBy: 'coach1', playerId: 'p1', docType: 'Medical Clearance',
      fileName: '  x.pdf  ', fileUrl: '  https://x/x.pdf  ', fileSize: 1024,
    });

    expect(insertPayload).toMatchObject({
      academy_id: 'a1', player_id: 'p1', doc_type: 'Medical Clearance',
      file_name: 'x.pdf', file_url: 'https://x/x.pdf', uploaded_by: 'coach1',
    });
  });
});

describe('documentsService.deleteDocument', () => {
  test('throws NotFoundError when the document does not belong to this academy', async () => {
    supabaseAdmin.from = jest.fn().mockReturnValue(mockChain({ data: null, error: null }));

    await expect(documentsService.deleteDocument({ academyId: 'a1', documentId: 'ghost' }))
      .rejects.toBeInstanceOf(NotFoundError);
  });

  test('deletes when the document exists in this academy', async () => {
    supabaseAdmin.from = jest.fn().mockImplementation(() => {
      const chain = mockChain({ data: { id: 'd1' }, error: null });
      chain.delete = jest.fn().mockReturnValue(mockChain({ data: null, error: null }));
      return chain;
    });

    await expect(documentsService.deleteDocument({ academyId: 'a1', documentId: 'd1' })).resolves.toBeUndefined();
  });
});
