import { describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { MobileTopChips } from './mobile-top-chips';

jest.mock(`next/link`, () => ({
  __esModule: true,
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) =>
    React.createElement(`a`, { href, ...props }, children),
}));

describe(`admin-v2 mobile top chips`, () => {
  const identity = {
    id: `admin-1`,
    email: `ops@example.com`,
    type: `ADMIN`,
    role: `OPS_ADMIN`,
    phase: `MVP-3 system maturity kickoff`,
    capabilities: [`exchange.read`, `documents.read`, `system.read`],
    workspaces: [`exchange`, `documents`, `system`],
  };

  it(`marks the active secondary workspace chip with aria-current`, () => {
    const markup = renderToStaticMarkup(<MobileTopChips identity={identity} activePath="/exchange/rates" />);

    expect(markup).toContain(`href="/exchange"`);
    expect(markup).toContain(`aria-current="page"`);
    expect(markup).toContain(`data-active="true"`);
  });

  it(`keeps non-active chips unmarked`, () => {
    const markup = renderToStaticMarkup(<MobileTopChips identity={identity} activePath="/system" />);

    expect(markup).toContain(`href="/documents"`);
    expect(markup).not.toContain(`href="/documents" aria-current="page"`);
  });
});
