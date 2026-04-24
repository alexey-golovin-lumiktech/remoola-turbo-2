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
  getOverviewSummary: jest.fn(),
  getQuickstarts: jest.fn(),
}));

const {
  getAdminIdentity: mockedGetAdminIdentity,
  getOverviewSummary: mockedGetOverviewSummary,
  getQuickstarts: mockedGetQuickstarts,
} = jest.requireMock(`../../../lib/admin-api.server`) as jest.Mocked<typeof AdminApi>;

async function loadSubject() {
  return (await import(`./page`)).default;
}

let OverviewPage: Awaited<ReturnType<typeof loadSubject>>;

describe(`admin-v2 overview quickstarts`, () => {
  beforeAll(async () => {
    OverviewPage = await loadSubject();
  });

  beforeEach(() => {
    mockedGetAdminIdentity.mockReset();
    mockedGetOverviewSummary.mockReset();
    mockedGetQuickstarts.mockReset();

    mockedGetAdminIdentity.mockResolvedValue({
      id: `admin-1`,
      email: `ops@example.com`,
      type: `ADMIN`,
      role: `OPS_ADMIN`,
      phase: `MVP-3`,
      capabilities: [`payments.read`, `audit.read`],
      workspaces: [`payments`, `audit`],
    });
    mockedGetOverviewSummary.mockResolvedValue({
      computedAt: `2026-04-23T10:00:00.000Z`,
      signals: {},
    });
    mockedGetQuickstarts.mockResolvedValue([
      {
        id: `verification-missing-documents`,
        label: `Verification missing documents`,
        description: `Focus missing documents.`,
        eyebrow: `Priority queue`,
        targetPath: `/verification`,
        surfaces: [`shell`, `overview`],
      },
      {
        id: `overdue-payments-sweep`,
        label: `Overdue payments sweep`,
        description: `Focus overdue payments.`,
        eyebrow: `Priority queue`,
        targetPath: `/payments`,
        surfaces: [`shell`, `overview`],
      },
      {
        id: `force-logout-audit-trail`,
        label: `Force logout audit trail`,
        description: `Inspect force logout actions.`,
        eyebrow: `Audit trail`,
        targetPath: `/audit/admin-actions`,
        surfaces: [`shell`, `overview`],
      },
    ]);
  });

  it(`shows only quickstarts for allowed workspaces`, async () => {
    const markup = renderToStaticMarkup(await OverviewPage());

    expect(mockedGetQuickstarts).toHaveBeenCalledWith(`overview`);
    expect(markup).toContain(`/payments?quickstart=overdue-payments-sweep`);
    expect(markup).toContain(`/audit/admin-actions?quickstart=force-logout-audit-trail`);
    expect(markup).not.toContain(`/verification?quickstart=verification-missing-documents`);
  });
});
