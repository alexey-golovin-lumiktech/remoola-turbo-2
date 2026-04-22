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

describe(`admin-v2 documents explorer`, () => {
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
      phase: `MVP-2 slice: documents workspace`,
      capabilities: [`documents.read`, `documents.manage`],
      workspaces: [`documents`],
    });
    mockedGetDocumentTags.mockResolvedValue({
      items: [
        {
          id: `tag-1`,
          name: `evidence`,
          reserved: false,
          usageCount: 2,
          createdAt: `2026-04-17T08:00:00.000Z`,
          updatedAt: `2026-04-17T08:10:00.000Z`,
          version: 1,
        },
      ],
    });
    mockedGetDocuments.mockResolvedValue({
      items: [
        {
          id: `doc-1`,
          originalName: `proof.pdf`,
          access: `PRIVATE`,
          mimeType: `application/pdf`,
          size: 2048,
          consumerId: `consumer-1`,
          consumerEmail: `owner@example.com`,
          createdAt: `2026-04-17T08:00:00.000Z`,
          version: 1713341400000,
          tags: [`evidence`],
          linkedPaymentRequestIds: [`payment-1`],
          assignedTo: null,
        },
      ],
      total: 1,
      page: 2,
      pageSize: 20,
    });
  });

  it(`renders evidence explorer links without leaking review queues or storage tooling`, async () => {
    const markup = renderToStaticMarkup(
      await DocumentsPage({
        searchParams: Promise.resolve({
          page: `2`,
          q: `proof`,
          consumerId: `consumer-1`,
          access: `PRIVATE`,
          tag: `evidence`,
          includeDeleted: `true`,
        }),
      }),
    );

    expect(mockedGetDocuments).toHaveBeenCalledWith({
      page: 2,
      q: `proof`,
      consumerId: `consumer-1`,
      access: `PRIVATE`,
      mimetype: undefined,
      sizeMin: undefined,
      sizeMax: undefined,
      createdFrom: undefined,
      createdTo: undefined,
      paymentRequestId: undefined,
      tag: `evidence`,
      tagId: undefined,
      includeDeleted: true,
    });
    expect(markup).toContain(`Evidence review boundaries`);
    expect(markup).toContain(`href="/documents/tags"`);
    expect(markup).toContain(`Bulk tag selected documents`);
    expect(markup).toContain(`href="/documents/doc-1"`);
    expect(markup).toContain(`href="/consumers/consumer-1"`);
    expect(markup).toContain(`href="/verification/consumer-1"`);
    expect(markup).toContain(`href="/payments/payment-1"`);
    expect(markup).toContain(`href="/documents?tag=evidence"`);
    expect(markup).not.toContain(`upload console`);
    expect(markup).not.toContain(`broken metadata`);
  });
});
