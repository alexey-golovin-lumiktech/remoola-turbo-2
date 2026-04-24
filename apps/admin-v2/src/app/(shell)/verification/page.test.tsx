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
  getQuickstart: jest.fn(),
  getVerificationQueue: jest.fn(),
  getSavedViews: jest.fn(),
}));

jest.mock(`../../../lib/admin-mutations.server`, () => ({
  createSavedViewAction: jest.fn(async () => undefined),
  updateSavedViewAction: jest.fn(async () => undefined),
  deleteSavedViewAction: jest.fn(async () => undefined),
}));

const {
  getAdminIdentity: mockedGetAdminIdentity,
  getQuickstart: mockedGetQuickstart,
  getVerificationQueue: mockedGetVerificationQueue,
  getSavedViews: mockedGetSavedViews,
} = jest.requireMock(`../../../lib/admin-api.server`) as jest.Mocked<typeof AdminApi>;

function expectDisabledLink(markup: string, href: string): void {
  const escapedHref = href.replace(/[.*+?^${}()|[\]\\]/g, `\\$&`);
  expect(markup).toMatch(
    new RegExp(
      `<a[^>]*(href="${escapedHref}"[^>]*aria-disabled="true"|aria-disabled="true"[^>]*href="${escapedHref}")`,
    ),
  );
}

async function loadSubject() {
  return (await import(`./page`)).default;
}

let VerificationQueuePage: Awaited<ReturnType<typeof loadSubject>>;

function baseRow(overrides: Partial<NonNullable<AdminApi.VerificationQueueResponse>[`items`][number]> = {}) {
  return {
    id: `consumer-1`,
    email: `one@example.com`,
    accountType: `PERSONAL`,
    contractorKind: null,
    verificationStatus: `PENDING`,
    stripeIdentityStatus: null,
    country: `DE`,
    createdAt: `2026-04-15T08:00:00.000Z`,
    updatedAt: `2026-04-15T08:00:00.000Z`,
    verificationUpdatedAt: `2026-04-15T08:00:00.000Z`,
    missingProfileData: false,
    missingDocuments: false,
    documentsCount: 1,
    slaBreached: false,
    assignedTo: null,
    ...overrides,
  };
}

function emptyQueue(): NonNullable<AdminApi.VerificationQueueResponse> {
  return {
    items: [],
    total: 0,
    page: 1,
    pageSize: 20,
    activeStatuses: [],
    sla: { breachedCount: 0, thresholdHours: 24, lastComputedAt: null },
  };
}

describe(`admin-v2 verification queue assignment column`, () => {
  beforeAll(async () => {
    VerificationQueuePage = await loadSubject();
  });

  beforeEach(() => {
    mockedGetAdminIdentity.mockReset();
    mockedGetQuickstart.mockReset();
    mockedGetVerificationQueue.mockReset();
    mockedGetSavedViews.mockReset();
    mockedGetAdminIdentity.mockResolvedValue({
      id: `admin-1`,
      email: `ops@example.com`,
      type: `ADMIN`,
      role: `OPS_ADMIN`,
      phase: `MVP-3`,
      capabilities: [`saved_views.manage`],
      workspaces: [`verification`],
    } as never);
    mockedGetQuickstart.mockResolvedValue(null);
    mockedGetSavedViews.mockResolvedValue({ views: [] });
  });

  it(`maps assigned and unassigned rows into queue links and assignee output`, async () => {
    mockedGetVerificationQueue.mockResolvedValue({
      items: [
        baseRow({
          id: `consumer-assigned`,
          email: `assigned@example.com`,
          assignedTo: { id: `admin-7`, name: null, email: `ops7@example.com` },
        }),
        baseRow({
          id: `consumer-free`,
          email: `free@example.com`,
          assignedTo: null,
        }),
      ],
      total: 2,
      page: 1,
      pageSize: 20,
      activeStatuses: [],
      sla: { breachedCount: 0, thresholdHours: 24, lastComputedAt: null },
    });

    const markup = renderToStaticMarkup(await VerificationQueuePage({ searchParams: Promise.resolve({}) }));

    expect(mockedGetVerificationQueue).toHaveBeenCalledWith({
      page: 1,
      status: undefined,
      stripeIdentityStatus: undefined,
      country: undefined,
      contractorKind: undefined,
      missingProfileData: false,
      missingDocuments: false,
    });
    expect(markup).toContain(`ops7@example.com`);
    expect(markup).toContain(`/verification/consumer-assigned`);
    expect(markup).toContain(`/verification/consumer-free`);
    expect(markup).toContain(`—`);
  });
});

describe(`admin-v2 verification queue saved views section`, () => {
  beforeAll(async () => {
    VerificationQueuePage = await loadSubject();
  });

  beforeEach(() => {
    mockedGetAdminIdentity.mockReset();
    mockedGetQuickstart.mockReset();
    mockedGetVerificationQueue.mockReset();
    mockedGetSavedViews.mockReset();
    mockedGetAdminIdentity.mockResolvedValue({
      id: `admin-1`,
      email: `ops@example.com`,
      type: `ADMIN`,
      role: `OPS_ADMIN`,
      phase: `MVP-3`,
      capabilities: [`saved_views.manage`],
      workspaces: [`verification`],
    } as never);
    mockedGetQuickstart.mockResolvedValue(null);
    mockedGetVerificationQueue.mockResolvedValue(emptyQueue());
    mockedGetSavedViews.mockResolvedValue({ views: [] });
  });

  it(`maps valid saved view payloads into apply links and rejects invalid payloads`, async () => {
    mockedGetSavedViews.mockResolvedValue({
      views: [
        {
          id: `view-1`,
          workspace: `verification_queue`,
          name: `Pending DE individuals`,
          description: `Stuck pending individual consumers in DE`,
          queryPayload: { status: `PENDING`, country: `DE`, contractorKind: `INDIVIDUAL` },
          createdAt: `2026-04-19T10:00:00.000Z`,
          updatedAt: `2026-04-19T10:00:00.000Z`,
        },
        {
          id: `view-2`,
          workspace: `verification_queue`,
          name: `Missing docs cohort`,
          description: null,
          queryPayload: { missingDocuments: true, missingProfileData: true },
          createdAt: `2026-04-19T11:00:00.000Z`,
          updatedAt: `2026-04-19T11:00:00.000Z`,
        },
        {
          id: `view-3`,
          workspace: `verification_queue`,
          name: `Legacy shape`,
          description: null,
          queryPayload: { foo: `bar` },
          createdAt: `2026-04-19T12:00:00.000Z`,
          updatedAt: `2026-04-19T12:00:00.000Z`,
        },
      ],
    });

    const markup = renderToStaticMarkup(await VerificationQueuePage({ searchParams: Promise.resolve({}) }));

    expect(mockedGetSavedViews).toHaveBeenCalledWith({ workspace: `verification_queue` });
    expect(markup).toContain(
      `href="/verification?status=PENDING&amp;country=DE&amp;contractorKind=INDIVIDUAL&amp;page=1"`,
    );
    expect(markup).toContain(`href="/verification?missingProfileData=true&amp;missingDocuments=true&amp;page=1"`);
    expect(markup).toContain(`Saved view payload could not be applied.`);
    expectDisabledLink(markup, `/verification?page=1`);
  });

  it(`falls back to an empty saved-view list when the fetch returns null`, async () => {
    mockedGetSavedViews.mockResolvedValue(null);

    const markup = renderToStaticMarkup(await VerificationQueuePage({ searchParams: Promise.resolve({}) }));

    expect(mockedGetSavedViews).toHaveBeenCalledWith({ workspace: `verification_queue` });
    expect(markup).toContain(`name="workspace" value="verification_queue"`);
    expect(markup).toContain(`name="queryPayload" value="{}"`);
  });

  it(`hides saved-view mutation affordances when saved_views.manage is missing`, async () => {
    mockedGetAdminIdentity.mockResolvedValueOnce({
      id: `admin-2`,
      email: `readonly@example.com`,
      type: `ADMIN`,
      role: `OPS_ADMIN`,
      phase: `MVP-3`,
      capabilities: [`verification.read`],
      workspaces: [`verification`],
    } as never);

    const markup = renderToStaticMarkup(await VerificationQueuePage({ searchParams: Promise.resolve({}) }));

    expect(mockedGetSavedViews).not.toHaveBeenCalled();
    expect(markup).toContain(`Saved view management is not available for this admin identity.`);
    expect(markup).not.toContain(`name="workspace" value="verification_queue"`);
  });

  it(`maps current filters into the saved view payload contract`, async () => {
    const markup = renderToStaticMarkup(
      await VerificationQueuePage({
        searchParams: Promise.resolve({
          status: `PENDING`,
          country: `US`,
          missingDocuments: `true`,
        }),
      }),
    );

    expect(mockedGetVerificationQueue).toHaveBeenCalledWith({
      page: 1,
      status: `PENDING`,
      stripeIdentityStatus: undefined,
      country: `US`,
      contractorKind: undefined,
      missingProfileData: false,
      missingDocuments: true,
    });
    expect(markup).toContain(
      `name="queryPayload" value="{&quot;status&quot;:&quot;PENDING&quot;,&quot;country&quot;:&quot;US&quot;,&quot;missingDocuments&quot;:true}"`,
    );
  });

  it(`treats array-shaped saved view payloads as invalid and falls back to defaults`, async () => {
    mockedGetSavedViews.mockResolvedValue({
      views: [
        {
          id: `view-array`,
          workspace: `verification_queue`,
          name: `Bad array payload`,
          description: null,
          queryPayload: [{ status: `PENDING` }] as unknown,
          createdAt: `2026-04-19T13:00:00.000Z`,
          updatedAt: `2026-04-19T13:00:00.000Z`,
        },
      ],
    });

    const markup = renderToStaticMarkup(await VerificationQueuePage({ searchParams: Promise.resolve({}) }));

    expect(markup).toContain(`Saved view payload could not be applied.`);
    expect(markup).toContain(`Use defaults`);
    expectDisabledLink(markup, `/verification?page=1`);
  });
});

describe(`admin-v2 verification quickstarts`, () => {
  beforeAll(async () => {
    VerificationQueuePage = await loadSubject();
  });

  beforeEach(() => {
    mockedGetAdminIdentity.mockReset();
    mockedGetQuickstart.mockReset();
    mockedGetVerificationQueue.mockReset();
    mockedGetSavedViews.mockReset();
    mockedGetAdminIdentity.mockResolvedValue({
      id: `admin-1`,
      email: `ops@example.com`,
      type: `ADMIN`,
      role: `OPS_ADMIN`,
      phase: `MVP-3`,
      capabilities: [`saved_views.manage`],
      workspaces: [`verification`],
    } as never);
    mockedGetSavedViews.mockResolvedValue({ views: [] });
    mockedGetVerificationQueue.mockResolvedValue(emptyQueue());
  });

  it(`resolves verification quickstarts server-side before loading the queue`, async () => {
    mockedGetQuickstart.mockResolvedValue({
      id: `verification-missing-documents`,
      label: `Verification missing documents`,
      description: `Focus the verification queue on cases blocked by missing consumer documents.`,
      eyebrow: `QUEUE-FIRST`,
      targetPath: `/verification`,
      surfaces: [`shell`, `overview`],
      filters: { missingDocuments: true },
    } as never);

    const markup = renderToStaticMarkup(
      await VerificationQueuePage({
        searchParams: Promise.resolve({ quickstart: `verification-missing-documents` }),
      }),
    );

    expect(mockedGetQuickstart).toHaveBeenCalledWith(`verification-missing-documents`);
    expect(mockedGetVerificationQueue).toHaveBeenCalledWith({
      page: 1,
      status: undefined,
      stripeIdentityStatus: undefined,
      country: undefined,
      contractorKind: undefined,
      missingProfileData: false,
      missingDocuments: true,
    });
    expect(markup).toContain(`href="/verification"`);
  });

  it(`shows a fallback banner when the quickstart id is invalid`, async () => {
    const markup = renderToStaticMarkup(
      await VerificationQueuePage({
        searchParams: Promise.resolve({ quickstart: `not-real` }),
      }),
    );

    expect(mockedGetQuickstart).not.toHaveBeenCalled();
    expect(mockedGetVerificationQueue).toHaveBeenCalledWith(
      expect.objectContaining({
        missingDocuments: false,
      }),
    );
    expect(markup).toContain(`could not be resolved`);
  });
});
