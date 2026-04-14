import { describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import HelpPage from './page';
import { HELP_GUIDE_SLUG } from '../../../features/help/guide-registry';

jest.mock(`next/link`, () => ({
  __esModule: true,
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) =>
    React.createElement(`a`, { href, ...props }, children),
}));

jest.mock(`../../../features/help/ui/HelpHubBrowseClient`, () => ({
  HelpHubBrowseClient: () => React.createElement(`section`, null, `Browse help guides`),
}));

describe(`consumer-css-grid help hub route`, () => {
  it(`renders the help hub shell with public-facing copy and guide links`, () => {
    const markup = renderToStaticMarkup(<HelpPage />);

    expect(markup).toContain(`Help Center`);
    expect(markup).toContain(`Start here`);
    expect(markup).toContain(`Help at a glance`);
    expect(markup).toContain(`Featured guides`);
    expect(markup).toContain(`Browse by category`);
    expect(markup).toContain(`/help/${HELP_GUIDE_SLUG.DASHBOARD_OVERVIEW}`);
    expect(markup).toContain(`/help/${HELP_GUIDE_SLUG.PAYMENTS_OVERVIEW}`);
    expect(markup).toContain(`Read guide`);

    expect(markup).not.toContain(`current help registry`);
    expect(markup).not.toContain(`Aligned to the planned help IA`);
    expect(markup).not.toContain(`planned help information architecture`);
  });
});
