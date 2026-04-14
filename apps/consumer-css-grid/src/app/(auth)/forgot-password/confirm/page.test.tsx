import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import ResetPasswordConfirmPage from './page';

describe(`consumer-css-grid forgot-password confirm page`, () => {
  it(`shows the invalid-link state when only referer is present`, async () => {
    const markup = renderToStaticMarkup(
      await ResetPasswordConfirmPage({
        searchParams: Promise.resolve({
          referer: `https://grid.example.com`,
        }),
      }),
    );

    expect(markup).toContain(`Invalid or missing link`);
    expect(markup).toContain(`Request a new reset link`);
    expect(markup).not.toContain(`Need help`);
    expect(markup).not.toContain(`Contextual help`);
    expect(markup).not.toContain(`Open help hub`);
    expect(markup).not.toContain(`Help Center`);
  });

  it(`renders the reset form when token is present without requiring referer`, async () => {
    const page = await ResetPasswordConfirmPage({
      searchParams: Promise.resolve({
        token: `reset-token`,
      }),
    });

    expect(React.isValidElement(page)).toBe(true);
    expect((page as React.ReactElement<{ token: string }>).props.token).toBe(`reset-token`);
  });
});
