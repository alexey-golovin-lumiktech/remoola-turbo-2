import { describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import HelpGuideDetailPage from './page';
import { HELP_GUIDE_SLUG } from '../../../../features/help/guide-registry';

jest.mock(`next/link`, () => ({
  __esModule: true,
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) =>
    React.createElement(`a`, { href, ...props }, children),
}));

describe(`consumer-css-grid help guide detail route`, () => {
  it(`renders a known help guide with route metadata and recovery links`, async () => {
    const markup = renderToStaticMarkup(
      await HelpGuideDetailPage({
        params: Promise.resolve({
          slug: HELP_GUIDE_SLUG.DASHBOARD_OVERVIEW,
        }),
      }),
    );

    expect(markup).toContain(`Dashboard overview`);
    expect(markup).toContain(`What this feature does`);
    expect(markup).toContain(`Guide details`);
    expect(markup).toContain(`Relevant workspace routes`);
    expect(markup).toContain(`/dashboard`);
    expect(markup).toContain(`Back to all guides`);
    expect(markup).toContain(`Back to help hub`);
  });

  it(`uses the not-found path for an unknown slug instead of rendering a broken detail page`, async () => {
    await expect(
      HelpGuideDetailPage({
        params: Promise.resolve({
          slug: `unknown-help-slug`,
        }),
      }),
    ).rejects.toThrow(`NEXT_HTTP_ERROR_FALLBACK;404`);
  });
});
