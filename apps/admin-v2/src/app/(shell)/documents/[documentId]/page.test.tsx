import { beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import type * as AdminApi from '../../../../lib/admin-api.server';

const mockedNotFound = jest.fn(() => {
  throw new Error(`NEXT_NOT_FOUND`);
});

jest.mock(`next/link`, () => ({
  __esModule: true,
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) =>
    React.createElement(`a`, { href, ...props }, children),
}));

jest.mock(`next/navigation`, () => ({
  notFound: mockedNotFound,
}));

jest.mock(`../../../../lib/admin-api.server`, () => ({
  getAdminIdentity: jest.fn(),
  getAdmins: jest.fn(),
  getDocumentCase: jest.fn(),
  getDocumentTags: jest.fn(),
}));

jest.mock(`../../../../lib/admin-mutations.server`, () => ({
  retagDocumentAction: jest.fn(),
  claimDocumentAssignmentAction: jest.fn(),
  releaseDocumentAssignmentAction: jest.fn(),
  reassignDocumentAssignmentAction: jest.fn(),
}));

const {
  getAdminIdentity: mockedGetAdminIdentity,
  getAdmins: mockedGetAdmins,
  getDocumentCase: mockedGetDocumentCase,
  getDocumentTags: mockedGetDocumentTags,
} = jest.requireMock(`../../../../lib/admin-api.server`) as jest.Mocked<typeof AdminApi>;

async function loadSubject() {
  return (await import(`./page`)).default;
}

let DocumentCasePage: Awaited<ReturnType<typeof loadSubject>>;

describe(`admin-v2 document case`, () => {
  beforeAll(async () => {
    DocumentCasePage = await loadSubject();
  });

  beforeEach(() => {
    mockedNotFound.mockClear();
    mockedGetAdminIdentity.mockReset();
    mockedGetAdmins.mockReset();
    mockedGetDocumentCase.mockReset();
    mockedGetDocumentTags.mockReset();
    mockedGetAdminIdentity.mockResolvedValue({
      id: `admin-1`,
      email: `super@example.com`,
      type: `SUPER`,
      role: `SUPER_ADMIN`,
      phase: `MVP-2 slice: documents workspace`,
      capabilities: [`documents.read`, `documents.manage`, `assignments.manage`],
      workspaces: [`documents`],
    });
    mockedGetAdmins.mockResolvedValue({
      items: [],
      pendingInvitations: [],
      total: 0,
      page: 1,
      pageSize: 50,
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
        {
          id: `tag-2`,
          name: `INVOICE-PENDING`,
          reserved: true,
          usageCount: 1,
          createdAt: `2026-04-17T08:00:00.000Z`,
          updatedAt: `2026-04-17T08:11:00.000Z`,
          version: 2,
        },
      ],
    });
    mockedGetDocumentCase.mockResolvedValue({
      id: `doc-1`,
      core: {
        id: `doc-1`,
        originalName: `proof.pdf`,
        access: `PRIVATE`,
        mimeType: `application/pdf`,
        size: 2048,
        createdAt: `2026-04-17T08:00:00.000Z`,
        deletedAt: null,
      },
      consumer: { id: `consumer-1`, email: `owner@example.com` },
      tags: [
        {
          id: `tag-1`,
          name: `evidence`,
        },
      ],
      linkedPaymentRequests: [
        {
          id: `payment-1`,
          amount: `42.00`,
          status: `WAITING`,
          createdAt: `2026-04-17T08:05:00.000Z`,
        },
      ],
      downloadUrl: `https://api.example.com/api/admin-v2/documents/doc-1/download`,
      version: 1713341400000,
      updatedAt: `2026-04-17T08:10:00.000Z`,
      staleWarning: false,
      dataFreshnessClass: `exact`,
      assignment: {
        current: null,
        history: [],
      },
    });
  });

  it(`renders case links and exact retag controls without extra workflow surfaces`, async () => {
    const markup = renderToStaticMarkup(
      await DocumentCasePage({
        params: Promise.resolve({ documentId: `doc-1` }),
      }),
    );

    expect(mockedGetDocumentCase).toHaveBeenCalledWith(`doc-1`);
    expect(markup).toContain(`Retag document`);
    expect(markup).toContain(`Save tags`);
    expect(markup).toContain(`href="/consumers/consumer-1"`);
    expect(markup).toContain(`href="/verification/consumer-1"`);
    expect(markup).toContain(`href="/payments/payment-1"`);
    expect(markup).toContain(`system-managed`);
    expect(markup).toContain(`There is no document review queue`);
    expect(markup).toContain(`bucket diagnostics`);
  });

  it(`delegates missing document records to notFound`, async () => {
    mockedGetDocumentCase.mockResolvedValueOnce(null);

    await expect(
      DocumentCasePage({
        params: Promise.resolve({ documentId: `missing-doc` }),
      }),
    ).rejects.toThrow(`NEXT_NOT_FOUND`);

    expect(mockedNotFound).toHaveBeenCalledTimes(1);
  });
});
