import { beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import type * as AdminApi from '../../../lib/admin-api.server';

jest.mock(`next/link`, () => ({
  __esModule: true,
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) =>
    React.createElement(`a`, { href, ...props }, children),
}));

jest.mock(`../../../lib/admin-api.server`, () => ({
  getAdminIdentity: jest.fn(),
  getDocuments: jest.fn(),
  getDocumentTags: jest.fn(),
}));

jest.mock(`../../../lib/admin-mutations.server`, () => ({
  bulkTagDocumentsAction: jest.fn(),
}));

const {
  getAdminIdentity: mockedGetAdminIdentity,
  getDocuments: mockedGetDocuments,
  getDocumentTags: mockedGetDocumentTags,
} = jest.requireMock(`../../../lib/admin-api.server`) as jest.Mocked<typeof AdminApi>;

async function loadSubject() {
  return (await import(`./page`)).default;
}

let DocumentsPage: Awaited<ReturnType<typeof loadSubject>>;

describe(`admin-v2 documents params`, () => {
  beforeAll(async () => {
    DocumentsPage = await loadSubject();
  });

  beforeEach(() => {
    mockedGetAdminIdentity.mockReset();
    mockedGetDocuments.mockReset();
    mockedGetDocumentTags.mockReset();

    mockedGetAdminIdentity.mockResolvedValue({
      id: `admin-1`,
      email: `super@example.com`,
      type: `SUPER`,
      role: `SUPER_ADMIN`,
      phase: `MVP-3`,
      capabilities: [`documents.read`, `documents.manage`],
      workspaces: [`documents`],
    });
    mockedGetDocuments.mockResolvedValue({
      items: [],
      total: 0,
      page: 2,
      pageSize: 20,
    } as never);
    mockedGetDocumentTags.mockResolvedValue({ items: [] } as never);
  });

  it(`maps search params into getDocuments filters`, async () => {
    const element = await DocumentsPage({
      searchParams: Promise.resolve({
        page: `2`,
        q: `proof`,
        consumerId: `consumer-1`,
        access: `PRIVATE`,
        mimetype: `application/pdf`,
        sizeMin: `1024`,
        sizeMax: `4096`,
        createdFrom: `2026-04-01T10:00`,
        createdTo: `2026-04-02T12:30`,
        paymentRequestId: `payment-1`,
        tag: `evidence`,
        tagId: `tag-1`,
        includeDeleted: `true`,
      }),
    });

    renderToStaticMarkup(element);

    expect(mockedGetDocuments).toHaveBeenCalledWith({
      page: 2,
      q: `proof`,
      consumerId: `consumer-1`,
      access: `PRIVATE`,
      mimetype: `application/pdf`,
      sizeMin: 1024,
      sizeMax: 4096,
      createdFrom: `2026-04-01T10:00`,
      createdTo: `2026-04-02T12:30`,
      paymentRequestId: `payment-1`,
      tag: `evidence`,
      tagId: `tag-1`,
      includeDeleted: true,
    });
  });
});
