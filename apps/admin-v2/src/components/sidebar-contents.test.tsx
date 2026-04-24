import { describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { SidebarContents } from './sidebar-contents';
import { type QuickstartCard } from '../lib/admin-api.server';

jest.mock(`next/link`, () => ({
  __esModule: true,
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) =>
    React.createElement(`a`, { href, ...props }, children),
}));

const allQuickstarts: QuickstartCard[] = [
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
];

describe(`SidebarContents`, () => {
  function expectCurrentLink(markup: string, href: string): void {
    const escapedHref = href.replace(/[.*+?^${}()|[\]\\]/g, `\\$&`);
    expect(markup).toMatch(
      new RegExp(
        `<a[^>]*(href="${escapedHref}"[^>]*aria-current="page"|aria-current="page"[^>]*href="${escapedHref}")`,
      ),
    );
  }

  it(`filters navigation by allowed workspaces and keeps the active workspace highlighted`, () => {
    const markup = renderToStaticMarkup(
      <SidebarContents
        identity={{
          id: `admin-1`,
          email: `ops@example.com`,
          type: `ADMIN`,
          role: `OPS_ADMIN`,
          phase: `MVP-3`,
          capabilities: [`overview.read`, `payments.read`, `audit.read`, `payment_methods.read`],
          workspaces: [`overview`, `payments`, `audit`, `payment_methods`],
        }}
        activePath="/payments"
        signalCounts={{}}
        quickstarts={[]}
      />,
    );

    expect(markup).toContain(`href="/overview"`);
    expectCurrentLink(markup, `/payments`);
    expect(markup).toContain(`href="/audit/auth"`);
    expect(markup).toContain(`href="/payment-methods"`);

    expect(markup).not.toContain(`href="/documents"`);
    expect(markup).not.toContain(`href="/exchange"`);
    expect(markup).not.toContain(`href="/payouts"`);
    expect(markup).not.toContain(`href="/system"`);
    expect(markup).not.toContain(`href="/admins"`);
  });

  it(`filters quickstarts by allowed workspaces`, () => {
    const markup = renderToStaticMarkup(
      <SidebarContents
        identity={{
          id: `admin-2`,
          email: `finance@example.com`,
          type: `ADMIN`,
          role: `OPS_ADMIN`,
          phase: `MVP-3`,
          capabilities: [`payments.read`, `audit.read`],
          workspaces: [`payments`, `audit`],
        }}
        activePath="/payments"
        signalCounts={{}}
        quickstarts={[...allQuickstarts]}
      />,
    );

    expect(markup).toContain(`/payments?quickstart=overdue-payments-sweep`);
    expect(markup).toContain(`/audit/admin-actions?quickstart=force-logout-audit-trail`);
    expect(markup).not.toContain(`/verification?quickstart=verification-missing-documents`);
  });

  it(`keeps all quickstarts when every target workspace is allowed`, () => {
    const markup = renderToStaticMarkup(
      <SidebarContents
        identity={{
          id: `admin-3`,
          email: `ops@example.com`,
          type: `ADMIN`,
          role: `OPS_ADMIN`,
          phase: `MVP-3`,
          capabilities: [`verification.read`, `payments.read`, `audit.read`],
          workspaces: [`verification`, `payments`, `audit`],
        }}
        activePath="/overview"
        signalCounts={{}}
        quickstarts={[...allQuickstarts]}
      />,
    );

    expect(markup).toContain(`/verification?quickstart=verification-missing-documents`);
    expect(markup).toContain(`/payments?quickstart=overdue-payments-sweep`);
    expect(markup).toContain(`/audit/admin-actions?quickstart=force-logout-audit-trail`);
  });
});
