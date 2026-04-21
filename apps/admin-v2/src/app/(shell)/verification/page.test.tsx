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
  getVerificationQueue: jest.fn(),
  getSavedViews: jest.fn(),
}));

jest.mock(`../../../lib/admin-mutations.server`, () => ({
  createSavedViewAction: jest.fn(async () => undefined),
  updateSavedViewAction: jest.fn(async () => undefined),
  deleteSavedViewAction: jest.fn(async () => undefined),
}));

const { getVerificationQueue: mockedGetVerificationQueue, getSavedViews: mockedGetSavedViews } = jest.requireMock(
  `../../../lib/admin-api.server`,
) as jest.Mocked<typeof AdminApi>;

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
    mockedGetVerificationQueue.mockReset();
    mockedGetSavedViews.mockReset();
    mockedGetSavedViews.mockResolvedValue({ views: [] });
  });

  it(`renders an assignee row and an unassigned row side by side`, async () => {
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

    expect(markup).toContain(`Assigned to`);
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
    mockedGetVerificationQueue.mockReset();
    mockedGetSavedViews.mockReset();
    mockedGetVerificationQueue.mockResolvedValue(emptyQueue());
    mockedGetSavedViews.mockResolvedValue({ views: [] });
  });

  it(`renders the saved views empty state with the save current view form`, async () => {
    const markup = renderToStaticMarkup(await VerificationQueuePage({ searchParams: Promise.resolve({}) }));

    expect(markup).toContain(`Saved views`);
    expect(markup).toContain(`No saved views yet.`);
    expect(markup).toContain(`Save current view`);
    expect(markup).toContain(`maxLength="100"`);
    expect(markup).toContain(`name="workspace" value="verification_queue"`);
    expect(markup).toContain(`cannot be used by alert evaluation (frontend-only filters)`);
    expect(mockedGetSavedViews).toHaveBeenCalledWith({ workspace: `verification_queue` });
  });

  it(`renders saved view rows with apply, delete and rename and an extracted href`, async () => {
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

    expect(markup).toContain(`Pending DE individuals`);
    expect(markup).toContain(`Stuck pending individual consumers in DE`);
    expect(markup).toContain(`Missing docs cohort`);
    expect(markup).toContain(`Legacy shape`);
    expect(markup).toContain(
      `href="/verification?status=PENDING&amp;country=DE&amp;contractorKind=INDIVIDUAL&amp;page=1"`,
    );
    expect(markup).toContain(`href="/verification?missingProfileData=true&amp;missingDocuments=true&amp;page=1"`);
    expect(markup).toContain(`Saved view payload could not be applied.`);
    expect(markup).toContain(`One or more saved views have an unrecognised payload shape and cannot be applied.`);
    expect(markup).toContain(`Delete`);
    expect(markup).toContain(`Rename or update`);
  });

  it(`falls back gracefully when the saved views fetch returns null`, async () => {
    mockedGetSavedViews.mockResolvedValue(null);

    const markup = renderToStaticMarkup(await VerificationQueuePage({ searchParams: Promise.resolve({}) }));

    expect(markup).toContain(`Saved views`);
    expect(markup).toContain(`No saved views yet.`);
  });

  it(`reflects current search params in the saved view payload preview`, async () => {
    const markup = renderToStaticMarkup(
      await VerificationQueuePage({
        searchParams: Promise.resolve({
          status: `PENDING`,
          country: `US`,
          missingDocuments: `true`,
        }),
      }),
    );

    expect(markup).toContain(`status=PENDING`);
    expect(markup).toContain(`country=US`);
    expect(markup).toContain(`missingDocuments=true`);
    expect(markup).toContain(
      `name="queryPayload" value="{&quot;status&quot;:&quot;PENDING&quot;,&quot;country&quot;:&quot;US&quot;,&quot;missingDocuments&quot;:true}"`,
    );
  });

  it(`rejects array-shaped saved view payloads as unapplyable`, async () => {
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

    expect(markup).toContain(`Bad array payload`);
    expect(markup).toContain(`Saved view payload could not be applied.`);
    expect(markup).toContain(`Use defaults`);
  });
});
