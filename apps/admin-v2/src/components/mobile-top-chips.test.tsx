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
  function expectChipActive(markup: string, href: string): void {
    const escapedHref = href.replace(/[.*+?^${}()|[\]\\]/g, `\\$&`);
    expect(markup).toMatch(
      new RegExp(
        `<a[^>]*(href="${escapedHref}"[^>]*aria-current="page"|aria-current="page"[^>]*href="${escapedHref}")`,
      ),
    );
  }

  const identity = {
    id: `admin-1`,
    email: `ops@example.com`,
    type: `ADMIN`,
    role: `OPS_ADMIN`,
    phase: `MVP-3 system maturity kickoff`,
    capabilities: [`exchange.read`, `documents.read`, `system.read`],
    workspaces: [`exchange`, `documents`, `system`],
  };

  it(`marks only the active secondary workspace chip as current`, () => {
    const markup = renderToStaticMarkup(<MobileTopChips identity={identity} activePath="/exchange/rates" />);

    expectChipActive(markup, `/exchange`);
    expect(markup).not.toContain(`href="/documents" aria-current="page"`);
  });

  it(`keeps non-active chips unmarked`, () => {
    const markup = renderToStaticMarkup(<MobileTopChips identity={identity} activePath="/system" />);

    expectChipActive(markup, `/system`);
    expect(markup).not.toContain(`href="/documents" aria-current="page"`);
  });
});
