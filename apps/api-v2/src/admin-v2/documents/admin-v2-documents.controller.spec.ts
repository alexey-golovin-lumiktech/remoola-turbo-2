import { AdminV2DocumentsController } from './admin-v2-documents.controller';

describe(`AdminV2DocumentsController`, () => {
  it(`guards read routes with documents.read and write routes with documents.manage only`, async () => {
    const assertCapability = jest.fn(async () => ({
      role: `OPS_ADMIN`,
      capabilities: [`documents.read`],
      workspaces: [`documents`],
      source: `schema`,
    }));
    const listDocuments = jest.fn(async () => ({ items: [], total: 0, page: 1, pageSize: 20 }));
    const listTags = jest.fn(async () => ({ items: [] }));
    const openDownload = jest.fn(async () => ({
      stream: {} as never,
      filename: `proof.pdf`,
      contentType: `application/pdf`,
      contentLength: 123,
    }));
    const getDocumentCase = jest.fn(async () => ({ id: `doc-1` }));
    const createTag = jest.fn(async () => ({ ok: true }));
    const updateTag = jest.fn(async () => ({ ok: true }));
    const deleteTag = jest.fn(async () => ({ ok: true }));
    const retagDocument = jest.fn(async () => ({ ok: true }));
    const bulkTagDocuments = jest.fn(async () => ({ ok: true }));

    const controller = new AdminV2DocumentsController(
      {
        listDocuments,
        listTags,
        openDownload,
        getDocumentCase,
        createTag,
        updateTag,
        deleteTag,
        retagDocument,
        bulkTagDocuments,
      } as never,
      { assertCapability } as never,
    );

    await controller.listDocuments(
      {
        id: `admin-1`,
        email: `ops@example.com`,
        type: `ADMIN`,
        sessionId: `session-1`,
      } as never,
      {
        page: `2`,
        pageSize: `10`,
        q: `contract`,
        consumerId: `consumer-1`,
        access: `PRIVATE`,
        mimetype: `application/pdf`,
        sizeMin: `1`,
        sizeMax: `1024`,
        createdFrom: `2026-04-01T00:00:00.000Z`,
        createdTo: `2026-04-17T00:00:00.000Z`,
        paymentRequestId: `payment-1`,
        tag: `evidence`,
        tagId: `tag-1`,
        includeDeleted: `true`,
      },
      {
        ip: `127.0.0.1`,
        protocol: `https`,
        headers: {
          host: `api.example.com`,
        },
        get: jest.fn((header: string) => (header === `host` ? `api.example.com` : undefined)),
      } as never,
    );

    await controller.listTags({
      id: `admin-1`,
      email: `ops@example.com`,
      type: `ADMIN`,
      sessionId: `session-1`,
    } as never);

    await controller.download(
      {
        id: `admin-1`,
        email: `ops@example.com`,
        type: `ADMIN`,
        sessionId: `session-1`,
      } as never,
      `doc-1`,
      {
        setHeader: jest.fn(),
      } as never,
    );

    await controller.getDocumentCase(
      {
        id: `admin-1`,
        email: `ops@example.com`,
        type: `ADMIN`,
        sessionId: `session-1`,
      } as never,
      `doc-1`,
      {
        ip: `127.0.0.1`,
        protocol: `https`,
        headers: {
          host: `api.example.com`,
        },
        get: jest.fn((header: string) => (header === `host` ? `api.example.com` : undefined)),
      } as never,
    );

    await controller.createTag(
      {
        id: `admin-1`,
        email: `super@example.com`,
        type: `SUPER`,
        sessionId: `session-1`,
      } as never,
      { name: `evidence` },
      {
        ip: `127.0.0.1`,
        headers: {
          'user-agent': `jest`,
          'idempotency-key': `idem-1`,
        },
      } as never,
    );

    await controller.updateTag(
      {
        id: `admin-1`,
        email: `super@example.com`,
        type: `SUPER`,
        sessionId: `session-1`,
      } as never,
      `tag-1`,
      { name: `reviewed`, version: 1 },
      {
        ip: `127.0.0.1`,
        headers: {
          'user-agent': `jest`,
          'idempotency-key': `idem-2`,
        },
      } as never,
    );

    await controller.deleteTag(
      {
        id: `admin-1`,
        email: `super@example.com`,
        type: `SUPER`,
        sessionId: `session-1`,
      } as never,
      `tag-1`,
      { version: 2, confirmed: true },
      {
        ip: `127.0.0.1`,
        headers: {
          'user-agent': `jest`,
          'idempotency-key': `idem-3`,
        },
      } as never,
    );

    await controller.retagDocument(
      {
        id: `admin-1`,
        email: `super@example.com`,
        type: `SUPER`,
        sessionId: `session-1`,
      } as never,
      `doc-1`,
      { version: 3, tagIds: [`tag-1`, `tag-2`] },
      {
        ip: `127.0.0.1`,
        headers: {
          'user-agent': `jest`,
          'idempotency-key': `idem-4`,
        },
      } as never,
    );

    await controller.bulkTagDocuments(
      {
        id: `admin-1`,
        email: `super@example.com`,
        type: `SUPER`,
        sessionId: `session-1`,
      } as never,
      { tagIds: [`tag-1`], resources: [{ resourceId: `doc-1`, version: 4 }] },
      {
        ip: `127.0.0.1`,
        headers: {
          'user-agent': `jest`,
          'idempotency-key': `idem-5`,
        },
      } as never,
    );

    expect(assertCapability).toHaveBeenNthCalledWith(1, expect.objectContaining({ id: `admin-1` }), `documents.read`);
    expect(listDocuments).toHaveBeenCalledWith({
      page: 2,
      pageSize: 10,
      q: `contract`,
      consumerId: `consumer-1`,
      access: `PRIVATE`,
      mimetype: `application/pdf`,
      sizeMin: 1,
      sizeMax: 1024,
      createdFrom: `2026-04-01T00:00:00.000Z`,
      createdTo: `2026-04-17T00:00:00.000Z`,
      paymentRequestId: `payment-1`,
      tag: `evidence`,
      tagId: `tag-1`,
      includeDeleted: true,
      backendBaseUrl: `https://api.example.com`,
    });
    expect(assertCapability).toHaveBeenNthCalledWith(2, expect.objectContaining({ id: `admin-1` }), `documents.read`);
    expect(assertCapability).toHaveBeenNthCalledWith(3, expect.objectContaining({ id: `admin-1` }), `documents.read`);
    expect(openDownload).toHaveBeenCalledWith(`doc-1`);
    expect(assertCapability).toHaveBeenNthCalledWith(4, expect.objectContaining({ id: `admin-1` }), `documents.read`);
    expect(getDocumentCase).toHaveBeenCalledWith(`doc-1`, `https://api.example.com`);
    expect(assertCapability).toHaveBeenNthCalledWith(5, expect.objectContaining({ id: `admin-1` }), `documents.manage`);
    expect(createTag).toHaveBeenCalledWith(
      `admin-1`,
      { name: `evidence` },
      expect.objectContaining({ idempotencyKey: `idem-1` }),
    );
    expect(assertCapability).toHaveBeenNthCalledWith(6, expect.objectContaining({ id: `admin-1` }), `documents.manage`);
    expect(updateTag).toHaveBeenCalledWith(
      `tag-1`,
      `admin-1`,
      { name: `reviewed`, version: 1 },
      expect.objectContaining({ idempotencyKey: `idem-2` }),
    );
    expect(assertCapability).toHaveBeenNthCalledWith(7, expect.objectContaining({ id: `admin-1` }), `documents.manage`);
    expect(deleteTag).toHaveBeenCalledWith(
      `tag-1`,
      `admin-1`,
      { version: 2, confirmed: true },
      expect.objectContaining({ idempotencyKey: `idem-3` }),
    );
    expect(assertCapability).toHaveBeenNthCalledWith(8, expect.objectContaining({ id: `admin-1` }), `documents.manage`);
    expect(retagDocument).toHaveBeenCalledWith(
      `doc-1`,
      `admin-1`,
      { version: 3, tagIds: [`tag-1`, `tag-2`] },
      expect.objectContaining({ idempotencyKey: `idem-4` }),
    );
    expect(assertCapability).toHaveBeenNthCalledWith(9, expect.objectContaining({ id: `admin-1` }), `documents.manage`);
    expect(bulkTagDocuments).toHaveBeenCalledWith(
      `admin-1`,
      { tagIds: [`tag-1`], resources: [{ resourceId: `doc-1`, version: 4 }] },
      expect.objectContaining({ idempotencyKey: `idem-5` }),
    );
  });
});
