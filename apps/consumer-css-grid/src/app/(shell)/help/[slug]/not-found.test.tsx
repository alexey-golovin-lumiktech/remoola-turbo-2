import { describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import HelpGuideNotFound from './not-found';

jest.mock(`next/link`, () => ({
  __esModule: true,
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) =>
    React.createElement(`a`, { href, ...props }, children),
}));

describe(`consumer-css-grid help guide not-found route`, () => {
  it(`keeps the recovery screen customer-facing and links back to the help hub`, () => {
    const markup = renderToStaticMarkup(<HelpGuideNotFound />);

    expect(markup).toContain(`Help Center`);
    expect(markup).toContain(`Guide not found`);
    expect(markup).toContain(`Back to Help Center`);
    expect(markup).toContain(`href="/help"`);

    expect(markup).not.toContain(`current help registry`);
    expect(markup).not.toContain(`planned help information architecture`);
  });
});
