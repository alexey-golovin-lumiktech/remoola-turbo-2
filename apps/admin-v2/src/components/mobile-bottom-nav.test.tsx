import { describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { MobileBottomNav } from './mobile-bottom-nav';

jest.mock(`next/link`, () => ({
  __esModule: true,
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) =>
    React.createElement(`a`, { href, ...props }, children),
}));

describe(`admin-v2 mobile bottom nav active state`, () => {
  function expectLinkActive(markup: string, href: string): void {
    const escapedHref = href.replace(/[.*+?^${}()|[\]\\]/g, `\\$&`);
    expect(markup).toMatch(
      new RegExp(`<a[^>]*(href="${escapedHref}"[^>]*data-active="true"|data-active="true"[^>]*href="${escapedHref}")`),
    );
  }

  const identity = {
    id: `admin-1`,
    email: `ops@example.com`,
    type: `ADMIN`,
    role: `OPS_ADMIN`,
    phase: `MVP-3 system maturity kickoff`,
    capabilities: [`payments.read`, `ledger.read`],
    workspaces: [`payments`, `ledger`],
  };

  it(`marks payments active for nested payment operations routes`, () => {
    const markup = renderToStaticMarkup(<MobileBottomNav identity={identity} activePath="/payments/operations" />);

    expectLinkActive(markup, `/payments`);
  });

  it(`marks ledger active for nested anomaly routes`, () => {
    const markup = renderToStaticMarkup(<MobileBottomNav identity={identity} activePath="/ledger/anomalies" />);

    expectLinkActive(markup, `/ledger`);
  });

  it(`keeps the full label available for long bottom-nav items`, () => {
    const markup = renderToStaticMarkup(<MobileBottomNav identity={identity} activePath="/ledger" />);

    expectLinkActive(markup, `/ledger`);
    expect(markup).toContain(`title="Ledger and Disputes"`);
    expect(markup).toContain(`aria-label="Ledger and Disputes"`);
  });
});
