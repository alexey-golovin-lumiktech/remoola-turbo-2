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
}));

const { getVerificationQueue: mockedGetVerificationQueue } = jest.requireMock(
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

describe(`admin-v2 verification queue assignment column`, () => {
  beforeAll(async () => {
    VerificationQueuePage = await loadSubject();
  });

  beforeEach(() => {
    mockedGetVerificationQueue.mockReset();
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
