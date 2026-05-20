import { beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';

import { type getAdminActionAudit } from '../../../../lib/admin-api/audit.server';
import { type getQuickstart } from '../../../../lib/admin-api/overview.server';
jest.mock(`next/link`, () => ({
  __esModule: true,
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) =>
    React.createElement(`a`, { href, ...props }, children),
}));

jest.mock(`../../../../lib/admin-api/audit.server`, () => ({
  getAdminActionAudit: jest.fn(),
}));

jest.mock(`../../../../lib/admin-api/overview.server`, () => ({
  getQuickstart: jest.fn(),
}));

const { getAdminActionAudit: mockedGetAdminActionAudit } = jest.requireMock(
  `../../../../lib/admin-api/audit.server`,
) as {
  getAdminActionAudit: jest.MockedFunction<typeof getAdminActionAudit>;
};

const { getQuickstart: mockedGetQuickstart } = jest.requireMock(`../../../../lib/admin-api/overview.server`) as {
  getQuickstart: jest.MockedFunction<typeof getQuickstart>;
};

async function loadSubject() {
  return (await import(`./page`)).default;
}

let AuditAdminActionsPage: Awaited<ReturnType<typeof loadSubject>>;

describe(`admin-v2 audit admin-actions quickstarts`, () => {
  beforeAll(async () => {
    AuditAdminActionsPage = await loadSubject();
  });

  beforeEach(() => {
    mockedGetAdminActionAudit.mockReset();
    mockedGetQuickstart.mockReset();
    mockedGetAdminActionAudit.mockResolvedValue({
      items: [],
      total: 40,
      page: 1,
      pageSize: 20,
    } as never);
  });

  it(`resolves force logout quickstarts into admin-action filters and preserves reset/removal paths`, async () => {
    mockedGetQuickstart.mockResolvedValue({
      id: `force-logout-audit-trail`,
      label: `Force logout audit trail`,
      description: `Review consumer force logout activity from the admin action log.`,
      eyebrow: `Audit trail`,
      targetPath: `/audit/admin-actions`,
      surfaces: [`shell`, `overview`],
      filters: {
        action: `consumer_force_logout`,
      },
    } as never);

    await AuditAdminActionsPage({
      searchParams: Promise.resolve({ quickstart: `force-logout-audit-trail` }),
    });

    expect(mockedGetQuickstart).toHaveBeenCalledWith(`force-logout-audit-trail`);
    expect(mockedGetAdminActionAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: `consumer_force_logout`,
      }),
    );
  });
});
