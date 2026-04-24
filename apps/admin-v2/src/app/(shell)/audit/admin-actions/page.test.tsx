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

  it(`resolves force logout quickstarts into admin-action filters and keeps reset/removal paths canonical`, async () => {
    mockedGetQuickstart.mockResolvedValue({
      id: `force-logout-audit-trail`,
      label: `Force logout audit trail`,
      description: `Reconstruct consumer force logout activity from the append-only admin action log.`,
      eyebrow: `AUDIT-FIRST`,
      targetPath: `/audit/admin-actions`,
      surfaces: [`shell`, `overview`],
      filters: {
        action: `consumer_force_logout`,
      },
    } as never);

    const markup = renderToStaticMarkup(
      await AuditAdminActionsPage({
        searchParams: Promise.resolve({ quickstart: `force-logout-audit-trail` }),
      }),
    );

    expect(mockedGetAdminActionAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: `consumer_force_logout`,
      }),
    );
    expect(markup).toContain(`Force logout audit trail`);
    expect(markup).toContain(`href="/audit/admin-actions"`);
    expect(markup).toContain(
      `/audit/admin-actions?quickstart=force-logout-audit-trail&amp;action=consumer_force_logout&amp;page=2`,
    );
  });
});
