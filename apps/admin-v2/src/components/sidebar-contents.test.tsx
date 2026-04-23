import { describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { SidebarContents } from './sidebar-contents';

jest.mock(`next/link`, () => ({
  __esModule: true,
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) =>
    React.createElement(`a`, { href, ...props }, children),
}));

describe(`SidebarContents`, () => {
  it(`shows only workspace-allowed navigation items`, () => {
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
    expect(markup).toContain(`href="/payments"`);
    expect(markup).toContain(`href="/audit/auth"`);
    expect(markup).toContain(`href="/payment-methods"`);

    expect(markup).not.toContain(`href="/documents"`);
    expect(markup).not.toContain(`href="/exchange"`);
    expect(markup).not.toContain(`href="/payouts"`);
    expect(markup).not.toContain(`href="/system"`);
    expect(markup).not.toContain(`href="/admins"`);
  });
});
