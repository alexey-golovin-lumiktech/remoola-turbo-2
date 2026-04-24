import { beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';

import type * as AdminApi from '../../../../lib/admin-api.server';

jest.mock(`next/link`, () => ({
  __esModule: true,
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) =>
    React.createElement(`a`, { href, ...props }, children),
}));

jest.mock(`../../../../lib/admin-api.server`, () => ({
  getAdminActionAudit: jest.fn(),
  getQuickstart: jest.fn(),
}));

const { getAdminActionAudit: mockedGetAdminActionAudit, getQuickstart: mockedGetQuickstart } = jest.requireMock(
  `../../../../lib/admin-api.server`,
) as jest.Mocked<typeof AdminApi>;

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
