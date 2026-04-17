import { beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import type * as AdminApi from '../../../../lib/admin-api.server';

jest.mock(`next/link`, () => ({
  __esModule: true,
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) =>
    React.createElement(`a`, { href, ...props }, children),
}));

jest.mock(`../../../../lib/admin-api.server`, () => ({
  getAdminIdentity: jest.fn(),
  getDocumentTags: jest.fn(),
}));

jest.mock(`../../../../lib/admin-mutations.server`, () => ({
  createDocumentTagAction: jest.fn(),
  updateDocumentTagAction: jest.fn(),
  deleteDocumentTagAction: jest.fn(),
}));

const { getAdminIdentity: mockedGetAdminIdentity, getDocumentTags: mockedGetDocumentTags } = jest.requireMock(
  `../../../../lib/admin-api.server`,
) as jest.Mocked<typeof AdminApi>;

async function loadSubject() {
  return (await import(`./page`)).default;
}

let DocumentTagsPage: Awaited<ReturnType<typeof loadSubject>>;

describe(`admin-v2 document tags`, () => {
  beforeAll(async () => {
    DocumentTagsPage = await loadSubject();
  });

  beforeEach(() => {
    mockedGetAdminIdentity.mockReset();
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
        {
          id: `tag-2`,
          name: `INVOICE-PENDING`,
          reserved: true,
          usageCount: 1,
          createdAt: `2026-04-17T08:00:00.000Z`,
          updatedAt: `2026-04-17T08:10:00.000Z`,
          version: 2,
        },
      ],
    });
  });

  it(`shows exact tag management actions while keeping reserved invoice tags read-only`, async () => {
    const markup = renderToStaticMarkup(
      await DocumentTagsPage({
        searchParams: Promise.resolve({ tagId: `tag-1` }),
      }),
    );

    expect(markup).toContain(`Create tag`);
    expect(markup).toContain(`Exact \`document_tag_create\` action only.`);
    expect(markup).toContain(`Update`);
    expect(markup).toContain(`Delete`);
    expect(markup).toContain(`Reserved invoice semantics stay outside Documents management.`);
    expect(markup).toContain(`href="/documents?tagId=tag-1"`);
  });
});
