import { beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';

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

async function loadSubject() {
  return (await import(`./page`)).default;
}

let VerificationQueuePage: Awaited<ReturnType<typeof loadSubject>>;

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

    await VerificationQueuePage({ searchParams: Promise.resolve({}) });

    expect(mockedGetSavedViews).not.toHaveBeenCalled();
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
      eyebrow: `Priority queue`,
      targetPath: `/verification`,
      surfaces: [`shell`, `overview`],
      filters: { missingDocuments: true },
    } as never);

    await VerificationQueuePage({
      searchParams: Promise.resolve({ quickstart: `verification-missing-documents` }),
    });

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
  });

  it(`shows a fallback banner when the quickstart id is invalid`, async () => {
    await VerificationQueuePage({
      searchParams: Promise.resolve({ quickstart: `not-real` }),
    });

    expect(mockedGetQuickstart).not.toHaveBeenCalled();
    expect(mockedGetVerificationQueue).toHaveBeenCalledWith(
      expect.objectContaining({
        missingDocuments: false,
      }),
    );
  });
});
