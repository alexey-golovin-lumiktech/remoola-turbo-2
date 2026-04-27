import { describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { SignalCard } from './signal-card';

jest.mock(`next/link`, () => ({
  __esModule: true,
  default: ({ href, children }: { href: string; children: React.ReactNode }) =>
    React.createElement(`a`, { href }, children),
}));

describe(`SignalCard`, () => {
  it(`keeps live available signals clickable`, () => {
    const markup = renderToStaticMarkup(
      React.createElement(SignalCard, {
        label: `Pending verifications`,
        count: 12,
        href: `/verification`,
        availability: `available`,
        phaseStatus: `live-actionable`,
      }),
    );

    expect(markup).toContain(`href="/verification"`);
    expect(markup).toContain(`LIVE SIGNAL`);
    expect(markup).toContain(`State: Live queue`);
  });

  it(`keeps degraded delivery signals non-clickable even when the phase is live`, () => {
    const markup = renderToStaticMarkup(
      React.createElement(SignalCard, {
        label: `Pending verifications`,
        count: null,
        href: `/verification`,
        availability: `temporarily-unavailable`,
        phaseStatus: `live-actionable`,
      }),
    );

    expect(markup).not.toContain(`href="/verification"`);
    expect(markup).toContain(`TEMPORARILY UNAVAILABLE`);
    expect(markup).toContain(`Delivery: Temporarily unavailable`);
  });
});
